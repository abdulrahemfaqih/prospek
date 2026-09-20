"""Unit tests for db.py using mocked Supabase client."""

from unittest.mock import MagicMock
import pytest
from prospek.db import DatabaseManager
from prospek.sources.base import RawPlaceRecord


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    return client


class TestDatabaseManager:
    def test_save_records_strict_upsert_rules(self, mock_supabase):
        db = DatabaseManager(client=mock_supabase)

        records = [
            RawPlaceRecord(
                place_id="ChIJ_test_001",
                name="Kedai Kopi Uji",
                source="serpapi",
                category="Kafe",
                category_group="makanan",
                province="Jawa Timur",
                city="Malang",
                address="Jl. Ijen",
                phone="081234567890",
                wa_number="6281234567890",
                website=None,
                has_website=False,
                website_kind="none",
                rating=4.7,
                reviews_count=90,
                lead_score=85,
            )
        ]

        # Table mock routing
        biz_table = MagicMock()
        leads_table = MagicMock()
        mock_supabase.table.side_effect = lambda name: biz_table if name == "businesses" else leads_table

        saved_biz, new_leads = db.save_records(records, batch_size=50)

        # 1. Verify businesses table upsert
        mock_supabase.table.assert_any_call("businesses")
        biz_table.upsert.assert_called_once()
        args, kwargs = biz_table.upsert.call_args
        payload = args[0][0]

        assert kwargs.get("on_conflict") == "place_id"
        # Must NOT contain first_seen_at to avoid overwriting existing creation timestamp
        assert "first_seen_at" not in payload
        # Must contain scraped_at
        assert "scraped_at" in payload
        assert payload["place_id"] == "ChIJ_test_001"
        assert payload["lead_score"] == 85

        # 2. Verify leads table upsert with ignore_duplicates=True (ON CONFLICT DO NOTHING)
        mock_supabase.table.assert_any_call("leads")
        leads_table.upsert.assert_called_once()
        lead_args, lead_kwargs = leads_table.upsert.call_args
        assert lead_kwargs.get("on_conflict") == "business_id"
        assert lead_kwargs.get("ignore_duplicates") is True
        lead_payload = lead_args[0][0]
        assert lead_payload["business_id"] == "ChIJ_test_001"
        assert lead_payload["status"] == "new"

    def test_is_combination_scraped_recently(self, mock_supabase):
        db = DatabaseManager(client=mock_supabase)

        # Mock recent job exists
        query_mock = MagicMock()
        query_mock.execute.return_value.data = [{"id": 10}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.gte.return_value.limit.return_value = query_mock

        assert db.is_combination_scraped_recently("Jawa Timur", "Malang", "kafe") is True

        # Mock no job exists
        query_mock.execute.return_value.data = []
        assert db.is_combination_scraped_recently("Jawa Timur", "Malang", "kafe") is False

    def test_save_records_deduplicates_duplicate_place_ids(self, mock_supabase):
        db = DatabaseManager(client=mock_supabase)

        records = [
            RawPlaceRecord(
                place_id="ChIJ_duplicate_001",
                name="Rental Mobil A (Page 1)",
                source="serpapi",
                category="Rental",
                city="Bangkalan",
                province="Jawa Timur",
            ),
            RawPlaceRecord(
                place_id="ChIJ_duplicate_001",
                name="Rental Mobil A (Page 2)",
                source="serpapi",
                category="Rental",
                city="Bangkalan",
                province="Jawa Timur",
            ),
            RawPlaceRecord(
                place_id="ChIJ_unique_002",
                name="Rental Mobil B",
                source="serpapi",
                category="Rental",
                city="Bangkalan",
                province="Jawa Timur",
            ),
        ]

        biz_table = MagicMock()
        leads_table = MagicMock()
        mock_supabase.table.side_effect = lambda name: biz_table if name == "businesses" else leads_table

        saved_biz, new_leads = db.save_records(records, batch_size=50)

        # Should deduplicate 3 items down to 2 unique place_ids
        biz_table.upsert.assert_called_once()
        args, kwargs = biz_table.upsert.call_args
        payloads = args[0]
        assert len(payloads) == 2
        assert {p["place_id"] for p in payloads} == {"ChIJ_duplicate_001", "ChIJ_unique_002"}

