"""SerpApi Google Maps source implementation."""

import logging
import time
from typing import Any, Dict, List, Optional, Tuple
import requests

from ..config import get_serpapi_key
from ..normalize import (
    classify_website,
    is_business_closed,
    is_chain_business,
    map_category_group,
    matches_city_or_province,
    normalize_wa_number,
)
from ..scoring import calculate_lead_score
from .base import RawPlaceRecord, Source

logger = logging.getLogger(__name__)

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"
SERPAPI_ACCOUNT_URL = "https://serpapi.com/account.json"


class SerpApiError(Exception):
    """Exception raised for SerpApi errors."""
    pass


class SerpApiQuotaExceededError(SerpApiError):
    """Exception raised when SerpApi monthly or hourly quota is exhausted."""
    pass


class SerpApiSource(Source):
    """Lead data source using SerpApi's Google Maps engine."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_serpapi_key()
        if not self.api_key:
            logger.warning("SerpApiSource initialized without an API key.")

    @property
    def name(self) -> str:
        return "serpapi"

    def get_account_info(self) -> Dict[str, Any]:
        """Fetch real-time account and quota information from SerpApi Account API.

        This call is free and does not consume search quota.
        """
        if not self.api_key:
            raise SerpApiError("Cannot check account: SERPAPI_API_KEY is not set.")

        params = {"api_key": self.api_key}
        try:
            resp = requests.get(SERPAPI_ACCOUNT_URL, params=params, timeout=15)
            if resp.status_code == 401:
                raise SerpApiError("Kunci SERPAPI_API_KEY tidak valid atau tidak diizinkan.")
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            raise SerpApiError(f"Gagal menghubungi SerpApi Account API: {e}") from e

    def fetch_raw_search(
        self,
        keyword: str,
        city: str,
        page: int = 0,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Execute a raw HTTP GET request to SerpApi engine=google_maps.

        Includes exponential backoff for 429/5xx and clean errors for 4xx.
        """
        if not self.api_key:
            raise SerpApiError(
                "SERPAPI_API_KEY belum disetel. Buat scraper/.env dari scraper/.env.example dan isi API key Anda."
            )

        query = f"{keyword} di {city}"
        params = {
            "engine": "google_maps",
            "type": "search",
            "q": query,
            "hl": "id",
            "gl": "id",
            "start": page * 20,
            "api_key": self.api_key,
        }

        backoff = 2
        for attempt in range(1, max_retries + 1):
            try:
                resp = requests.get(SERPAPI_SEARCH_URL, params=params, timeout=30)
                status = resp.status_code

                if status == 200:
                    data = resp.json()
                    if "error" in data:
                        err_msg = data["error"]
                        if "Monthly search limit reached" in err_msg or "searches exceeded" in err_msg.lower():
                            raise SerpApiQuotaExceededError(f"Jatah SerpApi habis: {err_msg}")
                        if "hasn't returned any results" in err_msg.lower() or "no results" in err_msg.lower():
                            logger.info("Google tidak menemukan hasil untuk kata kunci ini: %s", err_msg)
                            return {"local_results": []}
                        raise SerpApiError(f"SerpApi Error: {err_msg}")
                    return data

                # Check for rate limit or server error -> retry
                if status in (429, 500, 502, 503, 504):
                    if attempt == max_retries:
                        raise SerpApiError(
                            f"SerpApi gagal setelah {max_retries} kali percobaan (HTTP {status}): {resp.text}"
                        )
                    logger.warning(
                        "SerpApi returned %s. Retrying in %ds (attempt %d/%d)...",
                        status,
                        backoff,
                        attempt,
                        max_retries,
                    )
                    time.sleep(backoff)
                    backoff *= 2
                    continue

                if status == 401:
                    raise SerpApiError("Kunci SERPAPI_API_KEY salah atau tidak valid.")
                if status == 403:
                    raise SerpApiQuotaExceededError(
                        "Akses SerpApi ditolak (403). Periksa kuota pencarian akun Anda."
                    )

                resp.raise_for_status()

            except requests.RequestException as e:
                if attempt == max_retries:
                    raise SerpApiError(f"Gagal memanggil SerpApi: {e}") from e
                logger.warning(
                    "Network error (%s). Retrying in %ds (attempt %d/%d)...",
                    e,
                    backoff,
                    attempt,
                    max_retries,
                )
                time.sleep(backoff)
                backoff *= 2

        raise SerpApiError("SerpApi request failed after retries.")

    def parse_response(
        self,
        data: Dict[str, Any],
        city: str,
        province: str,
        category_group: str,
        keyword: str,
        include_chains: bool = False,
    ) -> Tuple[List[RawPlaceRecord], Dict[str, int]]:
        """Parse and normalize SerpApi response JSON into RawPlaceRecord objects.

        Returns:
            (records, stats_dict)
            stats_dict tracks: total_found, closed_skipped, chains_skipped, location_mismatched
        """
        local_results = data.get("local_results", [])
        records: List[RawPlaceRecord] = []
        stats = {
            "total_found": len(local_results),
            "closed_skipped": 0,
            "chains_skipped": 0,
            "location_mismatched": 0,
        }

        for item in local_results:
            name = (item.get("title") or "").strip()
            if not name:
                continue

            # 1. Skip closed businesses
            if is_business_closed(item):
                stats["closed_skipped"] += 1
                continue

            # 2. Skip chain businesses
            if not include_chains and is_chain_business(name):
                stats["chains_skipped"] += 1
                continue

            # 3. Skip mismatched location
            address = item.get("address")
            if not matches_city_or_province(address, city, province):
                stats["location_mismatched"] += 1
                continue

            # Identifier resolution: place_id -> data_id -> data_cid
            place_id = item.get("place_id")
            if not place_id:
                data_id = item.get("data_id")
                if data_id:
                    place_id = f"data:{data_id}"
                else:
                    data_cid = item.get("data_cid")
                    place_id = f"cid:{data_cid}" if data_cid else f"gen:{city}:{name}"

            # Rating & reviews
            rating = None
            if item.get("rating") is not None:
                try:
                    rating = round(float(item["rating"]), 1)
                except (ValueError, TypeError):
                    rating = None

            reviews_count = 0
            if item.get("reviews") is not None:
                try:
                    reviews_count = int(item["reviews"])
                except (ValueError, TypeError):
                    reviews_count = 0

            # Coordinates
            gps = item.get("gps_coordinates") or {}
            lat = gps.get("latitude")
            lng = gps.get("longitude")

            # Contact & Website
            phone = item.get("phone")
            wa_number = normalize_wa_number(phone)
            raw_website = item.get("website")
            has_website, website_kind, cleaned_website = classify_website(raw_website)

            # Category resolution: check specific raw_type first, fall back to query category_group
            raw_type = item.get("type")
            if not raw_type and isinstance(item.get("types"), list) and item["types"]:
                raw_type = item["types"][0]

            type_group = map_category_group(raw_type) if raw_type else "lainnya"
            if type_group != "lainnya":
                resolved_category_group = type_group
            else:
                resolved_category_group = category_group or map_category_group(keyword)

            # Maps URL
            maps_url = item.get("link")
            if not maps_url and not place_id.startswith("gen:"):
                clean_pid = place_id.replace("data:", "").replace("cid:", "")
                maps_url = f"https://www.google.com/maps/place/?q=place_id:{clean_pid}"

            # Scoring
            lead_score = calculate_lead_score(
                has_website=has_website,
                website_kind=website_kind,
                rating=rating,
                reviews_count=reviews_count,
                wa_number=wa_number,
                category_group=resolved_category_group,
            )

            record = RawPlaceRecord(
                place_id=place_id,
                source=self.name,
                name=name,
                category=raw_type or keyword,
                category_group=resolved_category_group,
                province=province,
                city=city,
                address=address,
                phone=phone,
                wa_number=wa_number,
                website=cleaned_website,
                has_website=has_website,
                website_kind=website_kind,
                rating=rating,
                reviews_count=reviews_count,
                maps_url=maps_url,
                lat=lat,
                lng=lng,
                lead_score=lead_score,
            )
            records.append(record)

        return records, stats

    def search(
        self,
        keyword: str,
        city: str,
        province: str,
        category_group: str,
        page: int = 0,
        include_chains: bool = False,
    ) -> List[RawPlaceRecord]:
        """Perform search and return normalized records."""
        data = self.fetch_raw_search(keyword=keyword, city=city, page=page)
        records, _ = self.parse_response(
            data=data,
            city=city,
            province=province,
            category_group=category_group,
            keyword=keyword,
            include_chains=include_chains,
        )
        return records
