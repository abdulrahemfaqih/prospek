"""Base interfaces and data structures for lead data sources."""

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional


@dataclass
class RawPlaceRecord:
    """Represents a normalized place record before persistence."""

    place_id: str
    name: str
    source: str = "serpapi"
    category: Optional[str] = None
    category_group: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    wa_number: Optional[str] = None
    website: Optional[str] = None
    has_website: bool = False
    website_kind: str = "none"  # 'none' | 'social' | 'own'
    rating: Optional[float] = None
    reviews_count: int = 0
    maps_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    lead_score: int = 0
    is_closed: bool = False
    is_chain: bool = False
    address_matches: bool = True

    def to_business_payload(self) -> Dict[str, Any]:
        """Convert to dictionary matching supabase businesses table columns."""
        return {
            "place_id": self.place_id,
            "source": self.source,
            "name": self.name,
            "category": self.category,
            "category_group": self.category_group,
            "province": self.province,
            "city": self.city,
            "address": self.address,
            "phone": self.phone,
            "wa_number": self.wa_number,
            "website": self.website,
            "has_website": self.has_website,
            "website_kind": self.website_kind,
            "rating": self.rating,
            "reviews_count": self.reviews_count,
            "maps_url": self.maps_url,
            "lat": self.lat,
            "lng": self.lng,
            "lead_score": self.lead_score,
        }


class Source(ABC):
    """Abstract interface for all lead data sources."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the source provider."""
        pass

    @abstractmethod
    def search(
        self,
        keyword: str,
        city: str,
        province: str,
        category_group: str,
        page: int = 0,
        include_chains: bool = False,
    ) -> List[RawPlaceRecord]:
        """Search and return a list of normalized place records.

        Args:
            keyword: The search keyword (e.g. 'kafe', 'rental mobil').
            city: Target city name (e.g. 'Malang').
            province: Target province name (e.g. 'Jawa Timur').
            category_group: Group name (e.g. 'makanan', 'persewaan').
            page: Page offset (0 = first 20 results, 1 = next 20, etc.).
            include_chains: If True, keep big chains instead of filtering out.
        """
        pass
