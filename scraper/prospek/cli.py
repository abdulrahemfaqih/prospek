"""Command-line interface and interactive runner for Prospek scraper."""

import argparse
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

# Enable UTF-8 encoding on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import questionary
from rich.console import Console
from rich.panel import Panel
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

from .budget import BudgetManager
from .config import (
    get_category_groups,
    get_provinces,
    get_serpapi_key,
    get_supabase_service_role_key,
    get_supabase_url,
)
from .db import DatabaseManager
from .sources.base import RawPlaceRecord
from .sources.serpapi import SerpApiError, SerpApiQuotaExceededError, SerpApiSource

console = Console()


def build_arg_parser() -> argparse.ArgumentParser:
    """Construct command-line argument parser."""
    parser = argparse.ArgumentParser(
        description="Prospek Scraper: Ambil calon klien website lokal dari Google Maps via SerpApi."
    )
    parser.add_argument(
        "--province",
        action="append",
        dest="provinces",
        help="Kode atau nama provinsi (jatim, jabar, jateng, jakarta, banten, atau 'all')",
    )
    parser.add_argument(
        "--city",
        action="append",
        dest="cities",
        help="Nama kota target (dapat diulang, contoh: --city Malang --city Batu)",
    )
    parser.add_argument(
        "--group",
        action="append",
        dest="groups",
        help="Kelompok kategori (makanan, persewaan, akomodasi, jasa, atau 'all')",
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=2,
        help="Jumlah halaman hasil SerpApi per kombinasi (default: 2, ~40 usaha)",
    )
    parser.add_argument(
        "--max-requests",
        type=int,
        default=40,
        help="Batas maksimal pencarian SerpApi untuk eksekusi ini (default: 40)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Tampilkan rencana tanpa memanggil API pencarian atau menulis ke database",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Jalankan ulang kombinasi meskipun sudah dicatat dalam 30 hari terakhir",
    )
    parser.add_argument(
        "--include-chains",
        action="store_true",
        help="Jangan lewati chain/waralaba besar (Indomaret, KFC, dll.)",
    )
    parser.add_argument(
        "--allow-over-budget",
        action="store_true",
        help="Izinkan melanjutkan pencarian melebihi anggaran 240 sampai batas keras 250",
    )
    return parser


def run_interactive_wizard() -> Dict[str, Any]:
    """Interactive questionary wizard when run without arguments."""
    all_provinces = get_provinces()
    all_groups = get_category_groups()

    console.print(
        Panel(
            "[bold cyan]Prospek Scraper[/] - Alat pencari calon klien usaha lokal tanpa website.\n"
            "Gunakan tombol panah & spasi untuk memilih opsi, lalu Enter untuk konfirmasi.",
            border_style="cyan",
        )
    )

    # 1. Select province
    prov_choices = ["Semua provinsi"] + [
        f"{key}: {data['name']}" for key, data in all_provinces.items()
    ]
    selected_prov_answers = questionary.checkbox(
        "Pilih provinsi target:",
        choices=prov_choices,
    ).ask()

    if not selected_prov_answers:
        console.print("[yellow]Batal: Tidak ada provinsi yang dipilih.[/]")
        sys.exit(0)

    selected_prov_keys = []
    if "Semua provinsi" in selected_prov_answers:
        selected_prov_keys = list(all_provinces.keys())
    else:
        for ans in selected_prov_answers:
            key = ans.split(":")[0].strip()
            selected_prov_keys.append(key)

    # 2. Select cities
    available_cities = []
    for p_key in selected_prov_keys:
        available_cities.extend(all_provinces[p_key]["cities"])
    # Deduplicate while preserving order
    available_cities = list(dict.fromkeys(available_cities))

    city_choices = ["Semua kota di provinsi terpilih"] + available_cities
    selected_city_answers = questionary.checkbox(
        "Pilih kota target:",
        choices=city_choices,
    ).ask()

    if not selected_city_answers:
        console.print("[yellow]Batal: Tidak ada kota yang dipilih.[/]")
        sys.exit(0)

    if "Semua kota di provinsi terpilih" in selected_city_answers:
        selected_cities = available_cities
    else:
        selected_cities = selected_city_answers

    # 3. Select category groups
    group_choices = ["Semua kelompok kategori"] + list(all_groups.keys())
    selected_group_answers = questionary.checkbox(
        "Pilih kelompok kategori usaha:",
        choices=group_choices,
    ).ask()

    if not selected_group_answers:
        console.print("[yellow]Batal: Tidak ada kelompok kategori yang dipilih.[/]")
        sys.exit(0)

    if "Semua kelompok kategori" in selected_group_answers:
        selected_groups = list(all_groups.keys())
    else:
        selected_groups = selected_group_answers

    # 4. Confirm default pages and max-requests
    pages = 2
    max_requests = 40

    return {
        "provinces": selected_prov_keys,
        "cities": selected_cities,
        "groups": selected_groups,
        "pages": pages,
        "max_requests": max_requests,
        "dry_run": False,
        "refresh": False,
        "include_chains": False,
        "allow_over_budget": False,
    }


def resolve_combinations(
    selected_provs: Optional[List[str]],
    selected_cities: Optional[List[str]],
    selected_groups: Optional[List[str]],
) -> List[Tuple[str, str, str, str]]:
    """Build list of (province_name, city, category_group, keyword) combinations."""
    all_provinces = get_provinces()
    all_groups = get_category_groups()

    # Resolve provinces
    prov_keys = []
    if not selected_provs or "all" in [p.lower() for p in selected_provs]:
        prov_keys = list(all_provinces.keys())
    else:
        for p in selected_provs:
            p_clean = p.lower().strip()
            matched = False
            for k, data in all_provinces.items():
                if p_clean in (k, data["name"].lower()):
                    prov_keys.append(k)
                    matched = True
                    break
            if not matched:
                console.print(f"[yellow]Peringatan:[/] Provinsi '{p}' tidak dikenali, dilewati.")

    if not prov_keys:
        prov_keys = list(all_provinces.keys())

    # Resolve category groups
    group_keys = []
    if not selected_groups or "all" in [g.lower() for g in selected_groups]:
        group_keys = list(all_groups.keys())
    else:
        for g in selected_groups:
            g_clean = g.lower().strip()
            if g_clean in all_groups:
                group_keys.append(g_clean)
            else:
                console.print(f"[yellow]Peringatan:[/] Kelompok kategori '{g}' tidak dikenal.")

    if not group_keys:
        group_keys = list(all_groups.keys())

    # Resolve cities
    combinations = []
    for p_key in prov_keys:
        prov_data = all_provinces[p_key]
        prov_name = prov_data["name"]
        prov_cities = prov_data["cities"]

        target_cities = []
        if selected_cities:
            # Filter cities matching this province
            target_cities = [c for c in prov_cities if any(sc.lower() in c.lower() for sc in selected_cities)]
        else:
            target_cities = prov_cities

        for city in target_cities:
            for grp in group_keys:
                keywords = all_groups[grp]
                for kw in keywords:
                    combinations.append((prov_name, city, grp, kw))

    return combinations


def execute_scraping(args_dict: Dict[str, Any]) -> None:
    """Main execution engine for Prospek scraper."""
    dry_run = args_dict.get("dry_run", False)
    refresh = args_dict.get("refresh", False)
    pages = args_dict.get("pages", 2)
    max_requests = args_dict.get("max_requests", 40)
    include_chains = args_dict.get("include_chains", False)
    allow_over_budget = args_dict.get("allow_over_budget", False)

    combinations = resolve_combinations(
        args_dict.get("provinces"),
        args_dict.get("cities"),
        args_dict.get("groups"),
    )

    if not combinations:
        console.print("[red]Tidak ada kombinasi kota dan kata kunci yang cocok.[/]")
        return

    # Initialize Services
    serpapi_source = SerpApiSource()
    db_manager = None

    if not dry_run:
        # Check credentials before starting
        s_key = get_serpapi_key()
        if not s_key:
            console.print(
                "[bold red]Galat:[/] SERPAPI_API_KEY belum disetel di scraper/.env.\n"
                "Salin scraper/.env.example menjadi scraper/.env dan isi API key Anda."
            )
            return

        sb_url = get_supabase_url()
        sb_key = get_supabase_service_role_key()
        if not sb_url or not sb_key or 'your-' in sb_key.lower() or 'placeholder' in sb_key.lower():
            console.print(
                "[bold red]Galat Kredensial Supabase:[/] SUPABASE_SERVICE_ROLE_KEY di scraper/.env masih berupa placeholder.\n"
                "Silakan buka Supabase Dashboard > Project Settings > API > salin 'service_role' secret key Anda ke scraper/.env."
            )
            return

        try:
            db_manager = DatabaseManager()
            db_manager.test_connection()
        except Exception as e:
            console.print(f"[bold red]Galat koneksi Supabase:[/] {e}")
            return

    budget = BudgetManager(serpapi_source=serpapi_source, db_manager=db_manager, console=console)
    b_status = budget.get_status()

    # Display plan panel
    total_combs = len(combinations)
    est_requests = total_combs * pages

    plan_table = Table(show_header=False, box=None, padding=(0, 2))
    plan_table.add_row("Total kombinasi (kota x keyword)", f"[bold]{total_combs}[/]")
    plan_table.add_row("Halaman per kombinasi", f"{pages} (~{pages * 20} usaha)")
    plan_table.add_row("Estimasi kebutuhan request", f"{est_requests} pencarian")
    plan_table.add_row("Batas run ini (--max-requests)", f"[cyan]{max_requests}[/] pencarian")
    plan_table.add_row(
        "Pemakaian bulan ini",
        f"[yellow]{b_status.used_this_month}[/] dari {b_status.monthly_limit} "
        f"([green]sisa {b_status.remaining_budget}[/] sebelum batas anggaran {b_status.budget_limit})",
    )
    plan_table.add_row("Mode", "[magenta]DRY-RUN (Simulasi)[/]" if dry_run else "[green]LIVE RUN[/]")

    console.print(Panel(plan_table, title="[bold]Rencana Scraping[/]", border_style="cyan"))

    # If in interactive mode or starting large run, ask confirmation
    if not args_dict.get("confirmed", False) and not dry_run:
        confirmed = questionary.confirm("Mulai proses scraping sekarang?").ask()
        if not confirmed:
            console.print("[yellow]Scraping dibatalkan.[/]")
            return

    # Check budget before loop
    can_proceed, reason = budget.check_can_search(allow_over_budget)
    if not can_proceed and not dry_run:
        console.print(f"[bold red]Tidak dapat melanjutkan:[/] {reason}")
        return

    # Execution tracking metrics
    requests_used = 0
    combs_executed = 0
    combs_skipped_30d = 0
    total_found = 0
    new_businesses = 0
    updated_businesses = 0
    new_leads_no_web = 0
    total_closed = 0
    total_chains = 0
    total_mismatched = 0
    interrupted = False
    unfinished_combinations = []

    progress = Progress(
        SpinnerColumn("line"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TextColumn("[ {task.completed}/{task.total} ]"),
        TimeElapsedColumn(),
        console=console,
    )

    with progress:
        task_id = progress.add_task("[cyan]Memproses kombinasi...", total=total_combs)

        for idx, (prov_name, city, category_grp, kw) in enumerate(combinations):
            # Check if max requests reached
            if requests_used >= max_requests:
                unfinished_combinations = combinations[idx:]
                console.print(f"\n[yellow]Batas --max-requests ({max_requests}) tercapai.[/]")
                break

            # Deduplication 30 days check
            if db_manager and not refresh:
                if db_manager.is_combination_scraped_recently(prov_name, city, kw, days=30):
                    combs_skipped_30d += 1
                    progress.advance(task_id)
                    continue

            progress.update(task_id, description=f"[cyan]{city} - {kw}")

            comb_records: List[RawPlaceRecord] = []
            comb_pages_fetched = 0

            try:
                for page in range(pages):
                    if requests_used >= max_requests:
                        break

                    # Budget check before every search
                    if not dry_run:
                        can_srch, srch_reason = budget.check_can_search(allow_over_budget)
                        if not can_srch:
                            console.print(f"\n[red]Penghentian anggaran:[/] {srch_reason}")
                            unfinished_combinations = combinations[idx:]
                            raise StopIteration("Budget limit reached")

                        # Pacing check (pause automatically if >= 45 reqs in current hour)
                        budget.enforce_pacing_if_needed()

                    # Execute search
                    if dry_run:
                        # Simulation mode: no network requests
                        requests_used += 1
                        comb_pages_fetched += 1
                        budget.record_request()
                    else:
                        try:
                            raw_data = serpapi_source.fetch_raw_search(
                                keyword=kw, city=city, page=page
                            )
                            requests_used += 1
                            comb_pages_fetched += 1
                            budget.record_request()

                            records, stats = serpapi_source.parse_response(
                                data=raw_data,
                                city=city,
                                province=prov_name,
                                category_group=category_grp,
                                keyword=kw,
                                include_chains=include_chains,
                            )
                            comb_records.extend(records)
                            total_found += stats["total_found"]
                            total_closed += stats["closed_skipped"]
                            total_chains += stats["chains_skipped"]
                            total_mismatched += stats["location_mismatched"]

                            # Google Maps returns max 20 results per page.
                            # If fewer than 20 raw results found, there are no further pages.
                            if stats["total_found"] < 20:
                                break

                        except SerpApiQuotaExceededError as e:
                            console.print(f"\n[bold red]Kuota Habis:[/] {e}")
                            unfinished_combinations = combinations[idx:]
                            raise StopIteration("Quota exhausted")
                        except SerpApiError as e:
                            console.print(f"\n[bold red]Galat SerpApi:[/] {e}")
                            break

                # Save batch to Supabase
                if db_manager and comb_records:
                    # In-memory deduplication across multi-page results
                    unique_comb_records: Dict[str, RawPlaceRecord] = {}
                    for r in comb_records:
                        if r.place_id:
                            unique_comb_records[r.place_id] = r
                    distinct_records = list(unique_comb_records.values())

                    saved_count, new_leads = db_manager.save_records(distinct_records)
                    new_businesses += new_leads
                    updated_businesses += (saved_count - new_leads)

                    # Count new leads without website
                    for r in distinct_records:
                        if not r.has_website and r.website_kind in ("none", "social"):
                            new_leads_no_web += 1

                    # Record job
                    db_manager.record_scrape_job(
                        province=prov_name,
                        city=city,
                        keyword=kw,
                        pages_fetched=comb_pages_fetched,
                        places_found=len(distinct_records),
                        places_new=new_leads,
                    )

                combs_executed += 1
                progress.advance(task_id)

            except KeyboardInterrupt:
                console.print("\n[yellow]Menerima sinyal interupsi (Ctrl+C). Menyimpan progres berjalan...[/]")
                interrupted = True
                unfinished_combinations = combinations[idx:]
                break
            except StopIteration:
                break

    # Final summary display
    final_status = budget.get_status()
    summary_table = Table(title="Ringkasan Hasil Eksekusi", border_style="cyan")
    summary_table.add_column("Metrik", style="bold")
    summary_table.add_column("Jumlah", justify="right")

    summary_table.add_row("Kombinasi dijalankan", str(combs_executed))
    summary_table.add_row("Kombinasi dilewati (30 hari terakhir)", str(combs_skipped_30d))
    summary_table.add_row("Request SerpApi terpakai pada sesi ini", str(requests_used))
    if not dry_run:
        summary_table.add_row("Total tempat ditemukan", str(total_found))
        summary_table.add_row("Tempat baru disimpan ke database", f"[green]{new_businesses}[/]")
        summary_table.add_row("Tempat diperbarui (upsert)", str(updated_businesses))
        summary_table.add_row("Calon lead tanpa website", f"[bold green]{new_leads_no_web}[/]")
        summary_table.add_row("Dilewati: Usaha tutup", str(total_closed))
        summary_table.add_row("Dilewati: Chain besar", str(total_chains))
        summary_table.add_row("Dilewati: Beda kota/provinsi", str(total_mismatched))
    else:
        summary_table.add_row("Mode", "[magenta]Dry-run (tanpa penulisan ke database)[/]")

    summary_table.add_row(
        "Sisa jatah SerpApi bulan ini",
        f"[bold cyan]{final_status.remaining_budget}[/] (dari anggaran {final_status.budget_limit})",
    )

    console.print("\n")
    console.print(summary_table)

    if unfinished_combinations:
        console.print(
            f"\n[yellow]Catatan:[/] Masih terdapat {len(unfinished_combinations)} kombinasi yang belum diproses. "
            "Jalankan kembali script untuk melanjutkan sisanya (kombinasi yang sudah tersimpan akan otomatis dilewati)."
        )
    elif not interrupted:
        console.print("\n[bold green][OK] Selesai:[/] Seluruh kombinasi terpilih berhasil diproses.")


def main() -> None:
    """CLI entry point."""
    parser = build_arg_parser()
    args = parser.parse_args()

    # If any filtering arguments provided, run in argument mode
    if any([args.provinces, args.cities, args.groups, args.dry_run, args.refresh]):
        args_dict = {
            "provinces": args.provinces,
            "cities": args.cities,
            "groups": args.groups,
            "pages": args.pages,
            "max_requests": args.max_requests,
            "dry_run": args.dry_run,
            "refresh": args.refresh,
            "include_chains": args.include_chains,
            "allow_over_budget": args.allow_over_budget,
            "confirmed": True,
        }
    else:
        # No arguments -> Interactive Questionary wizard
        args_dict = run_interactive_wizard()
        args_dict["confirmed"] = True

    execute_scraping(args_dict)


if __name__ == "__main__":
    main()
