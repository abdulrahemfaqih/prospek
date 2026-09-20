"""Unit tests for SerpApiSource parsing using stored fixtures."""

import json
from pathlib import Path
import pytest

from prospek.sources.serpapi import SerpApiSource

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def maps_malang_fixture():
    fixture_path = FIXTURES_DIR / "serpapi_maps_malang.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


class TestSerpApiSourceParsing:
    def test_parse_fixture_correctly(self, maps_malang_fixture):
        source = SerpApiSource(api_key="mock_key")
        records, stats = source.parse_response(
            data=maps_malang_fixture,
            city="Malang",
            province="Jawa Timur",
            category_group="makanan",
            keyword="kafe",
            include_chains=False,
        )

        assert stats["total_found"] == 6
        assert stats["closed_skipped"] == 1
        assert stats["chains_skipped"] == 1
        assert stats["location_mismatched"] == 1
        assert len(records) == 3

        # Record 1: Kopi Senja Dinoyo (High prospect, no website, has WA)
        senja = next(r for r in records if "Kopi Senja" in r.name)
        assert senja.place_id == "ChIJbXG_5kF11y0R8SenjaMalang"
        assert senja.wa_number == "6281234567890"
        assert senja.has_website is False
        assert senja.website_kind == "none"
        assert senja.rating == 4.6
        assert senja.reviews_count == 128
        assert senja.lead_score == 85  # 40 (no web) + 15 (r>=4.0) + 15 (rev>=50) + 15 (wa)

        # Record 2: Rental Motor Jaya Malang (Instagram only, rental category)
        rental = next(r for r in records if "Rental Motor" in r.name)
        assert rental.wa_number == "6285678912345"
        assert rental.has_website is False
        assert rental.website_kind == "social"
        # 30 (social) + 15 (r>=4.0) + 15 (rev>=50) + 15 (wa) + 10 (persewaan) = 85
        assert rental.lead_score == 85

        # Record 3: Otentik Resto (Own website, landline phone 0341)
        otentik = next(r for r in records if "Otentik Resto" in r.name)
        assert otentik.wa_number is None  # 0341 landline is not WhatsApp cellular
        assert otentik.has_website is True
        assert otentik.website_kind == "own"
        assert otentik.website == "https://otentikresto.co.id"
        assert otentik.lead_score == 30  # 0 (own web) + 15 (r>=4.0) + 15 (rev>=50) + 0 (no wa)

    def test_include_chains_flag(self, maps_malang_fixture):
        source = SerpApiSource(api_key="mock_key")
        records, stats = source.parse_response(
            data=maps_malang_fixture,
            city="Malang",
            province="Jawa Timur",
            category_group="makanan",
            keyword="kafe",
            include_chains=True,
        )

        assert stats["chains_skipped"] == 0
        chain_names = [r.name for r in records]
        assert any("Kopi Kenangan" in n for n in chain_names)
        assert len(records) == 4

    def test_fetch_raw_search_handles_no_results(self, monkeypatch):
        source = SerpApiSource(api_key="mock_key")
        mock_resp = type("MockResponse", (), {
            "status_code": 200,
            "json": lambda self: {"error": "Google hasn't returned any results for this query."}
        })()
        monkeypatch.setattr("prospek.sources.serpapi.requests.get", lambda *args, **kwargs: mock_resp)

        res = source.fetch_raw_search("sewa gedung", "Bangkalan", page=0)
        assert res == {"local_results": []}

