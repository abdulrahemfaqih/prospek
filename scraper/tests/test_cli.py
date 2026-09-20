"""Unit tests for CLI parsing and combinations resolution."""

import pytest
from prospek.cli import build_arg_parser, execute_scraping, resolve_combinations


class TestCli:
    def test_arg_parser_defaults(self):
        parser = build_arg_parser()
        args = parser.parse_args([])

        assert args.provinces is None
        assert args.cities is None
        assert args.groups is None
        assert args.pages == 2
        assert args.max_requests == 40
        assert args.dry_run is False
        assert args.refresh is False
        assert args.include_chains is False
        assert args.allow_over_budget is False

    def test_arg_parser_custom_flags(self):
        parser = build_arg_parser()
        cmd = [
            "--province", "jatim",
            "--city", "Malang",
            "--city", "Batu",
            "--group", "persewaan",
            "--pages", "1",
            "--max-requests", "20",
            "--dry-run",
            "--refresh",
            "--include-chains",
            "--allow-over-budget",
        ]
        args = parser.parse_args(cmd)

        assert args.provinces == ["jatim"]
        assert args.cities == ["Malang", "Batu"]
        assert args.groups == ["persewaan"]
        assert args.pages == 1
        assert args.max_requests == 20
        assert args.dry_run is True
        assert args.refresh is True
        assert args.include_chains is True
        assert args.allow_over_budget is True

    def test_resolve_combinations(self):
        combs = resolve_combinations(
            selected_provs=["jatim"],
            selected_cities=["Malang"],
            selected_groups=["persewaan"],
        )
        # In config.yaml, persewaan has 9 keywords:
        # [rental mobil, rental motor, sewa alat camping, sewa alat outdoor, sewa kamera,
        #  sewa tenda, sewa sound system, sewa gedung, sewa dekorasi]
        assert len(combs) == 9
        for prov_name, city, group, kw in combs:
            assert prov_name == "Jawa Timur"
            assert city == "Malang"
            assert group == "persewaan"

    def test_execute_scraping_dry_run_terminates_cleanly(self):
        # Run small dry-run
        args = {
            "provinces": ["jatim"],
            "cities": ["Batu"],
            "groups": ["persewaan"],
            "pages": 1,
            "max_requests": 3,
            "dry_run": True,
            "refresh": True,
            "confirmed": True,
        }
        # Should complete without error
        execute_scraping(args)

    def test_arg_parser_history_flag(self):
        parser = build_arg_parser()
        args = parser.parse_args(["--history"])
        assert args.history is True

    def test_display_history_with_mock(self, monkeypatch):
        from unittest.mock import MagicMock
        from prospek.cli import display_history

        mock_db = MagicMock()
        mock_db.return_value.get_scrape_history.return_value = [
            {
                "ran_at": "2026-09-20T12:00:00Z",
                "city": "Bangkalan",
                "province": "Jawa Timur",
                "keyword": "rental mobil Bangkalan",
                "pages_fetched": 2,
                "places_found": 35,
                "places_new": 28,
            }
        ]
        monkeypatch.setattr("prospek.cli.DatabaseManager", mock_db)

        # Should execute cleanly and format table
        display_history(limit=5)

