"""Unit tests for normalization module."""

import pytest
from prospek.normalize import (
    classify_website,
    is_business_closed,
    is_chain_business,
    map_category_group,
    matches_city_or_province,
    normalize_wa_number,
)


class TestNormalizeWaNumber:
    def test_standard_indonesian_mobile_with_leading_zero(self):
        assert normalize_wa_number("0812-3456-7890") == "6281234567890"
        assert normalize_wa_number("0856 7891 2345") == "6285678912345"
        assert normalize_wa_number("089912345678") == "6289912345678"

    def test_international_format_with_plus_or_prefix(self):
        assert normalize_wa_number("+62 812-3456-7890") == "6281234567890"
        assert normalize_wa_number("6281234567890") == "6281234567890"

    def test_starting_with_eight_without_zero(self):
        assert normalize_wa_number("81234567890") == "6281234567890"

    def test_landline_and_office_numbers_return_none(self):
        # 0341 (Malang)
        assert normalize_wa_number("(0341) 456-789") is None
        assert normalize_wa_number("0341456789") is None
        assert normalize_wa_number("+62 341 456789") is None
        # 021 (Jakarta)
        assert normalize_wa_number("(021) 555-1234") is None
        assert normalize_wa_number("62215551234") is None
        # 031 (Surabaya)
        assert normalize_wa_number("031-8901234") is None

    def test_empty_or_invalid_numbers_return_none(self):
        assert normalize_wa_number(None) is None
        assert normalize_wa_number("") is None
        assert normalize_wa_number("   ") is None
        assert normalize_wa_number("abc-def") is None
        assert normalize_wa_number("12345") is None  # too short


class TestClassifyWebsite:
    def test_empty_or_null_website(self):
        assert classify_website(None) == (False, "none", None)
        assert classify_website("") == (False, "none", None)
        assert classify_website("none") == (False, "none", None)
        assert classify_website("-") == (False, "none", None)

    def test_social_media_and_marketplace_links(self):
        has_w, kind, url = classify_website("https://www.instagram.com/kopisenja_malang/")
        assert has_w is False
        assert kind == "social"
        assert url == "https://www.instagram.com/kopisenja_malang/"

        has_w, kind, _ = classify_website("https://linktr.ee/senjacafe")
        assert has_w is False
        assert kind == "social"

        has_w, kind, _ = classify_website("https://facebook.com/warung.barokah")
        assert has_w is False
        assert kind == "social"

        has_w, kind, _ = classify_website("https://wa.me/628123456789")
        assert has_w is False
        assert kind == "social"

        has_w, kind, _ = classify_website("https://shopee.co.id/tokokueenak")
        assert has_w is False
        assert kind == "social"

    def test_own_website(self):
        has_w, kind, url = classify_website("https://kopisenja.com")
        assert has_w is True
        assert kind == "own"
        assert url == "https://kopisenja.com"

        has_w, kind, _ = classify_website("http://www.senjacafe.id/menu")
        assert has_w is True
        assert kind == "own"


class TestIsBusinessClosed:
    def test_closed_flags(self):
        assert is_business_closed({"operating_status": "permanently_closed"}) is True
        assert is_business_closed({"operating_status": "temporarily_closed"}) is True
        assert is_business_closed({"business_status": "CLOSED_PERMANENTLY"}) is True
        assert is_business_closed({"business_status": "CLOSED_TEMPORARILY"}) is True
        assert is_business_closed({"permanently_closed": True}) is True
        assert is_business_closed({"open_state": "Permanently closed"}) is True
        assert is_business_closed({"description": "Toko sudah tutup permanen"}) is True

    def test_open_business(self):
        assert is_business_closed({"business_status": "OPERATIONAL", "open_state": "Open ⋅ Closes 22:00"}) is False
        assert is_business_closed({}) is False


class TestIsChainBusiness:
    def test_detects_blocklist_chains(self):
        assert is_chain_business("Indomaret Point Dinoyo") is True
        assert is_chain_business("Alfamart Soekarno Hatta") is True
        assert is_chain_business("KFC Malang Town Square") is True
        assert is_chain_business("McDonald's Kayutangan") is True
        assert is_chain_business("Starbucks Reserve") is True
        assert is_chain_business("Kopi Kenangan Matos") is True

    def test_independent_local_business(self):
        assert is_chain_business("Kopi Senja Dinoyo") is False
        assert is_chain_business("Rental Motor Jaya") is False
        assert is_chain_business("Homestay Bunga Batu") is False


class TestMatchesCityOrProvince:
    def test_matches_address(self):
        addr = "Jl. MT Haryono No. 120, Dinoyo, Kec. Lowokwaru, Kota Malang, Jawa Timur 65144"
        assert matches_city_or_province(addr, "Malang", "Jawa Timur") is True
        assert matches_city_or_province(addr, "Batu", "Jawa Timur") is True  # Jatim matches

    def test_mismatched_address(self):
        addr = "Jl. Pintu Besar Utara No. 14, Jakarta Barat, DKI Jakarta 11110"
        assert matches_city_or_province(addr, "Malang", "Jawa Timur") is False


class TestMapCategoryGroup:
    def test_maps_keywords_correctly(self):
        assert map_category_group("kafe", "Coffee shop") == "makanan"
        assert map_category_group("rental mobil", "Car rental agency") == "persewaan"
        assert map_category_group("homestay", "Guest house") == "akomodasi"
        assert map_category_group("barbershop", "Hair salon") == "jasa"
        assert map_category_group("toko besi", "Hardware store") == "lainnya"
