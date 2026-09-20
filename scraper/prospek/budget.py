"""Budget tracking and rate limit pacing for SerpApi."""

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, Optional, Tuple

from rich.console import Console

from .config import get_serpapi_limits
from .db import DatabaseManager
from .sources.serpapi import SerpApiSource

logger = logging.getLogger(__name__)


@dataclass
class BudgetStatus:
    """Current usage and budget status."""

    used_this_month: int
    monthly_limit: int
    budget_limit: int
    remaining_budget: int
    used_this_hour: int
    hourly_limit: int
    hourly_soft_limit: int
    source_type: str  # 'account_api' | 'db_fallback' | 'offline_estimate'


class BudgetManager:
    """Manages SerpApi search budget, quota limits, and hourly pacing."""

    def __init__(
        self,
        serpapi_source: Optional[SerpApiSource] = None,
        db_manager: Optional[DatabaseManager] = None,
        console: Optional[Console] = None,
    ):
        self.source = serpapi_source or SerpApiSource()
        self.db = db_manager
        self.console = console or Console()

        limits_cfg = get_serpapi_limits()
        self.monthly_limit = limits_cfg.get("free_monthly_searches", 250)
        self.budget_limit = limits_cfg.get("monthly_budget", 240)
        self.hourly_limit = limits_cfg.get("hourly_limit", 50)
        self.hourly_soft_limit = limits_cfg.get("hourly_soft_limit", 45)

        # Local in-session request counters
        self.session_requests_made = 0
        self.current_hour_bucket = datetime.now(timezone.utc).hour
        self.session_hour_requests = 0

    def get_status(self) -> BudgetStatus:
        """Fetch current monthly and hourly usage status."""
        used_month = 0
        used_hour = 0
        source_type = "offline_estimate"

        # 1. Try SerpApi Account API (preferred, accurate & free)
        try:
            acc_info = self.source.get_account_info()
            if "this_month_usage" in acc_info:
                used_month = int(acc_info.get("this_month_usage", 0))
                used_hour = int(acc_info.get("this_hour_searches", 0))
                source_type = "account_api"
                return BudgetStatus(
                    used_this_month=used_month + self.session_requests_made,
                    monthly_limit=self.monthly_limit,
                    budget_limit=self.budget_limit,
                    remaining_budget=max(0, self.budget_limit - (used_month + self.session_requests_made)),
                    used_this_hour=used_hour + self.session_hour_requests,
                    hourly_limit=self.hourly_limit,
                    hourly_soft_limit=self.hourly_soft_limit,
                    source_type=source_type,
                )
        except Exception as e:
            logger.debug("SerpApi Account API check skipped or failed: %s", e)

        # 2. Try DB fallback (sum pages_fetched from scrape_jobs this month)
        if self.db:
            try:
                db_month = self.db.get_monthly_pages_fetched_fallback()
                used_month = db_month + self.session_requests_made
                used_hour = self.session_hour_requests
                source_type = "db_fallback"
                return BudgetStatus(
                    used_this_month=used_month,
                    monthly_limit=self.monthly_limit,
                    budget_limit=self.budget_limit,
                    remaining_budget=max(0, self.budget_limit - used_month),
                    used_this_hour=used_hour,
                    hourly_limit=self.hourly_limit,
                    hourly_soft_limit=self.hourly_soft_limit,
                    source_type=source_type,
                )
            except Exception as e:
                logger.debug("Database fallback budget check failed: %s", e)

        # 3. Offline session estimate
        return BudgetStatus(
            used_this_month=self.session_requests_made,
            monthly_limit=self.monthly_limit,
            budget_limit=self.budget_limit,
            remaining_budget=max(0, self.budget_limit - self.session_requests_made),
            used_this_hour=self.session_hour_requests,
            hourly_limit=self.hourly_limit,
            hourly_soft_limit=self.hourly_soft_limit,
            source_type=source_type,
        )

    def check_can_search(
        self, allow_over_budget: bool = False
    ) -> Tuple[bool, str]:
        """Check if another search request can be safely performed."""
        status = self.get_status()

        if status.used_this_month >= status.budget_limit and not allow_over_budget:
            msg = (
                f"Anggaran bulanan ({status.budget_limit} pencarian) telah tercapai "
                f"(terpakai {status.used_this_month} dari {status.monthly_limit}). "
                "Gunakan --allow-over-budget bila ingin melanjutkan sisa jatah kuota."
            )
            return False, msg

        if status.used_this_month >= status.monthly_limit:
            msg = (
                f"Jatah gratis bulanan SerpApi ({status.monthly_limit} pencarian) habis. "
                "Hentikan proses dan tunggu reset bulan depan."
            )
            return False, msg

        return True, "OK"

    def record_request(self) -> None:
        """Record that a live search request was made."""
        self.session_requests_made += 1

        now_hour = datetime.now(timezone.utc).hour
        if now_hour != self.current_hour_bucket:
            self.current_hour_bucket = now_hour
            self.session_hour_requests = 0

        self.session_hour_requests += 1

    def enforce_pacing_if_needed(self) -> None:
        """Check hourly soft limit (45) and pause automatically until the next hour."""
        status = self.get_status()
        if status.used_this_hour >= self.hourly_soft_limit:
            now = datetime.now(timezone.utc)
            seconds_until_next_hour = (60 - now.minute) * 60 - now.second + 10
            wait_minutes = round(seconds_until_next_hour / 60)

            self.console.print(
                f"\n[yellow]Peringatan Pacing:[/] Telah melakukan {status.used_this_hour} pencarian "
                f"dalam jam ini (batas aman: {self.hourly_soft_limit}, batas keras: {self.hourly_limit}).\n"
                f"Menjeda otomatis selama {wait_minutes} menit ({seconds_until_next_hour} detik) "
                "agar tidak terkena limit per jam..."
            )
            time.sleep(seconds_until_next_hour)
            self.session_hour_requests = 0
            self.current_hour_bucket = datetime.now(timezone.utc).hour
            self.console.print("[green]Jeda selesai, melanjutkan pencarian...[/]\n")
