"""Unit tests for budget and rate limit pacing management."""

from unittest.mock import MagicMock
import pytest
from prospek.budget import BudgetManager


@pytest.fixture
def mock_serpapi_source():
    source = MagicMock()
    source.get_account_info.return_value = {
        "this_month_usage": 50,
        "searches_per_month": 250,
        "this_hour_searches": 10,
    }
    return source


@pytest.fixture
def mock_db_manager():
    db = MagicMock()
    db.get_monthly_pages_fetched_fallback.return_value = 35
    return db


class TestBudgetManager:
    def test_status_from_account_api(self, mock_serpapi_source):
        mgr = BudgetManager(serpapi_source=mock_serpapi_source)
        status = mgr.get_status()

        assert status.used_this_month == 50
        assert status.monthly_limit == 250
        assert status.budget_limit == 240
        assert status.remaining_budget == 190
        assert status.used_this_hour == 10
        assert status.source_type == "account_api"

    def test_status_from_db_fallback_when_account_api_fails(self, mock_db_manager):
        failing_source = MagicMock()
        failing_source.get_account_info.side_effect = Exception("API error")

        mgr = BudgetManager(serpapi_source=failing_source, db_manager=mock_db_manager)
        status = mgr.get_status()

        assert status.used_this_month == 35
        assert status.budget_limit == 240
        assert status.remaining_budget == 205
        assert status.source_type == "db_fallback"

    def test_budget_enforcement(self, mock_serpapi_source):
        # 1. Under budget
        mock_serpapi_source.get_account_info.return_value = {"this_month_usage": 200, "this_hour_searches": 5}
        mgr = BudgetManager(serpapi_source=mock_serpapi_source)
        can_srch, _ = mgr.check_can_search(allow_over_budget=False)
        assert can_srch is True

        # 2. Reached monthly budget (240) without flag
        mock_serpapi_source.get_account_info.return_value = {"this_month_usage": 240, "this_hour_searches": 5}
        mgr = BudgetManager(serpapi_source=mock_serpapi_source)
        can_srch, msg = mgr.check_can_search(allow_over_budget=False)
        assert can_srch is False
        assert "240" in msg

        # 3. Reached monthly budget (240) WITH allow_over_budget flag
        can_srch, _ = mgr.check_can_search(allow_over_budget=True)
        assert can_srch is True

        # 4. Reached hard provider limit (250) -> blocked even with allow_over_budget
        mock_serpapi_source.get_account_info.return_value = {"this_month_usage": 250, "this_hour_searches": 5}
        mgr = BudgetManager(serpapi_source=mock_serpapi_source)
        can_srch, msg = mgr.check_can_search(allow_over_budget=True)
        assert can_srch is False
        assert "250" in msg

    def test_record_request_increments_counter(self, mock_serpapi_source):
        mock_serpapi_source.get_account_info.return_value = {"this_month_usage": 10, "this_hour_searches": 2}
        mgr = BudgetManager(serpapi_source=mock_serpapi_source)

        mgr.record_request()
        mgr.record_request()

        status = mgr.get_status()
        assert status.used_this_month == 12
        assert status.used_this_hour == 4
