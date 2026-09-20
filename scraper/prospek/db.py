"""Database operations for Prospek scraper using Supabase."""

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
from supabase import Client, create_client

from .config import get_supabase_service_role_key, get_supabase_url
from .sources.base import RawPlaceRecord

logger = logging.getLogger(__name__)


def get_supabase_client(
    supabase_url: Optional[str] = None,
    service_role_key: Optional[str] = None,
) -> Client:
    """Initialize Supabase client with service role key."""
    url = supabase_url or get_supabase_url()
    key = service_role_key or get_supabase_service_role_key()

    if not url or not key:
        raise ValueError(
            "Supabase credentials missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "are configured in scraper/.env"
        )

    return create_client(url, key)


class DatabaseManager:
    """Handles batch persistence, upsert rules, and job tracking."""

    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_client()

    def test_connection(self) -> None:
        """Verify that Supabase credentials can authenticate successfully."""
        try:
            self.client.table("scrape_jobs").select("id").limit(1).execute()
        except Exception as e:
            raise ValueError(
                "Koneksi Supabase ditolak (401). Pastikan SUPABASE_SERVICE_ROLE_KEY di scraper/.env "
                "menggunakan kunci 'service_role' (secret) yang valid dari Supabase Dashboard."
            ) from e

    def is_combination_scraped_recently(
        self,
        province: str,
        city: str,
        keyword: str,
        days: int = 30,
    ) -> bool:
        """Check if combination (province, city, keyword) was fetched in the last N days."""
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        try:
            res = (
                self.client.table("scrape_jobs")
                .select("id")
                .eq("province", province)
                .eq("city", city)
                .eq("keyword", keyword)
                .gte("ran_at", cutoff)
                .limit(1)
                .execute()
            )
            return len(res.data) > 0
        except Exception as e:
            logger.warning("Failed to check scrape history for (%s, %s, %s): %s", province, city, keyword, e)
            return False

    def get_monthly_pages_fetched_fallback(self) -> int:
        """Sum pages_fetched from scrape_jobs since the 1st day of the current month.

        Used as backup if SerpApi Account API is unreachable.
        """
        now = datetime.now(timezone.utc)
        first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
        try:
            res = (
                self.client.table("scrape_jobs")
                .select("pages_fetched")
                .gte("ran_at", first_of_month)
                .execute()
            )
            total = sum(int(item.get("pages_fetched", 0)) for item in res.data)
            return total
        except Exception as e:
            logger.warning("Failed to calculate monthly fallback pages: %s", e)
            return 0

    def record_scrape_job(
        self,
        province: str,
        city: str,
        keyword: str,
        pages_fetched: int,
        places_found: int,
        places_new: int,
        source: str = "serpapi",
    ) -> Dict[str, Any]:
        """Record job summary into scrape_jobs table."""
        payload = {
            "source": source,
            "province": province,
            "city": city,
            "keyword": keyword,
            "pages_fetched": pages_fetched,
            "places_found": places_found,
            "places_new": places_new,
            "ran_at": datetime.now(timezone.utc).isoformat(),
        }
        res = self.client.table("scrape_jobs").insert(payload).execute()
        return res.data[0] if res.data else payload

    def save_records(
        self,
        records: List[RawPlaceRecord],
        batch_size: int = 50,
    ) -> Tuple[int, int]:
        """Batch save records to Supabase according to strict upsert rules:

        1. `businesses`: upsert on conflict (place_id) updating only scraped columns.
           Does NOT overwrite `first_seen_at`.
        2. `leads`: insert on conflict (business_id) DO NOTHING (ignore duplicates).
           Scraper NEVER updates `leads` status or notes!

        Returns:
            (saved_count, new_leads_count)
        """
        if not records:
            return 0, 0

        # In-memory deduplication by place_id before batching.
        # PostgreSQL ON CONFLICT DO UPDATE will fail with SQLSTATE 21000
        # ("ON CONFLICT DO UPDATE command cannot affect row a second time")
        # if the same batch contains duplicate conflict target keys.
        unique_records: Dict[str, RawPlaceRecord] = {}
        for r in records:
            if r.place_id:
                unique_records[r.place_id] = r
        clean_records = list(unique_records.values())

        if not clean_records:
            return 0, 0

        now_iso = datetime.now(timezone.utc).isoformat()
        total_saved = 0
        total_new_leads = 0

        for i in range(0, len(clean_records), batch_size):
            chunk = clean_records[i : i + batch_size]

            # Prepare business payloads
            biz_payloads = []
            leads_payloads = []

            for r in chunk:
                item = r.to_business_payload()
                item["scraped_at"] = now_iso
                biz_payloads.append(item)

                leads_payloads.append({
                    "business_id": r.place_id,
                    "status": "new",
                })

            # 1. Upsert businesses
            try:
                self.client.table("businesses").upsert(
                    biz_payloads, on_conflict="place_id"
                ).execute()
                total_saved += len(chunk)
            except Exception as e:
                logger.error("Failed to upsert businesses batch: %s", e)
                raise

            # 2. Insert leads with ignore_duplicates=True (ON CONFLICT DO NOTHING)
            try:
                lead_res = self.client.table("leads").upsert(
                    leads_payloads,
                    on_conflict="business_id",
                    ignore_duplicates=True,
                ).execute()
                if lead_res.data:
                    total_new_leads += len(lead_res.data)
            except Exception as e:
                logger.error("Failed to insert leads batch: %s", e)
                # Non-fatal if businesses already saved, but log error
                pass

        return total_saved, total_new_leads
