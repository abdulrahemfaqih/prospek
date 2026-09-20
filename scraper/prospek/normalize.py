"""Normalization helpers for business data."""

import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from .config import get_blocklist_chains, get_category_groups, get_social_domains


def normalize_wa_number(phone: Optional[str]) -> Optional[str]:
    """Normalize phone number to WhatsApp international format (628xxxxxxxxxx).

    Rules:
    - Strip non-digits.
    - 08xxxxxxxx -> 628xxxxxxxx.
    - If starting with 62, the digit right after 62 must be 8. If not (e.g. 62341... landline), returns None.
    - Returns None if empty or not a valid Indonesian cellular number.
    """
    if not phone:
        return None

    # Remove all non-digits
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return None

    # Handle 08xxxxxxxx -> 628xxxxxxxx
    if digits.startswith("08"):
        normalized = "628" + digits[2:]
    elif digits.startswith("628"):
        normalized = digits
    elif digits.startswith("62"):
        # Not starting with 8 after 62 -> Landline / office number (e.g. 0341, 021)
        return None
    elif digits.startswith("8"):
        # Sometimes recorded without leading 0 (e.g. 8123456789)
        normalized = "628" + digits[1:]
    else:
        # Unknown or foreign prefix
        return None

    # Cellular numbers in Indonesia typically 10 to 15 digits total with 62
    if len(normalized) < 10 or len(normalized) > 15:
        return None

    return normalized


def classify_website(
    website: Optional[str], social_domains: Optional[List[str]] = None
) -> Tuple[bool, str, Optional[str]]:
    """Classify website kind into: 'none', 'social', or 'own'.

    Returns:
        (has_website, website_kind, cleaned_url)
        - has_website is True ONLY when website_kind is 'own'.
    """
    if not website or not str(website).strip():
        return False, "none", None

    cleaned_url = str(website).strip()
    if cleaned_url.lower() in ("none", "null", "-", "#"):
        return False, "none", None

    # Ensure protocol for proper parsing
    target_url = cleaned_url
    if not target_url.startswith(("http://", "https://")):
        target_url = "https://" + target_url

    try:
        parsed = urlparse(target_url)
        domain = (parsed.netloc or "").lower().split(":")[0]
        # Remove leading www.
        if domain.startswith("www."):
            domain = domain[4:]
    except Exception:
        domain = ""

    if not domain:
        return False, "none", None

    if social_domains is None:
        social_domains = get_social_domains()

    # Check if domain matches or is subdomain of any social/marketplace domain
    for soc in social_domains:
        soc = soc.lower().strip()
        if domain == soc or domain.endswith("." + soc):
            return False, "social", cleaned_url

    return True, "own", cleaned_url


def is_business_closed(item: Dict[str, Any]) -> bool:
    """Check if place is permanently or temporarily closed."""
    # Check explicit fields commonly returned by SerpApi / Google Maps
    op_status = str(item.get("operating_status", "")).lower()
    biz_status = str(item.get("business_status", "")).upper()
    is_perm_closed = item.get("permanently_closed") is True

    if op_status in ("permanently_closed", "temporarily_closed"):
        return True
    if biz_status in ("CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"):
        return True
    if is_perm_closed:
        return True

    # Check open_state / description strings
    open_state = str(item.get("open_state", "")).lower()
    description = str(item.get("description", "")).lower()
    for text in (open_state, description):
        if "permanently closed" in text or "tutup permanen" in text:
            return True
        if "temporarily closed" in text or "tutup sementara" in text:
            return True

    return False


def is_chain_business(name: str, chains: Optional[List[str]] = None) -> bool:
    """Check if business name belongs to a big chain from blocklist."""
    if not name:
        return False

    if chains is None:
        chains = get_blocklist_chains()

    name_clean = name.lower()
    # Normalize punctuation into spaces for clean word boundary checks
    name_tokens = set(re.findall(r"\b[\w']+\b", name_clean))

    for chain in chains:
        chain_lower = chain.lower()
        # Direct substring match or token match
        if chain_lower in name_clean:
            return True
        if chain_lower in name_tokens:
            return True

    return False


def matches_city_or_province(
    address: Optional[str], city: str, province: str
) -> bool:
    """Check if address matches the expected city or province.

    Prevents scraping results that bleed into unrelated regions.
    """
    if not address or not address.strip():
        # If address is missing, do not drop blindly
        return True

    addr_lower = address.lower()
    city_lower = city.lower()
    prov_lower = province.lower()

    # Direct city or province name check
    if city_lower in addr_lower or prov_lower in addr_lower:
        return True

    # Check city without prefix (e.g. "Jakarta Selatan" -> "selatan" or "jakarta")
    city_words = [w for w in city_lower.split() if w not in ("kota", "kabupaten", "kab.")]
    for w in city_words:
        if len(w) > 3 and w in addr_lower:
            return True

    return False


def map_category_group(
    keyword: str,
    raw_type: Optional[str] = None,
    groups: Optional[Dict[str, List[str]]] = None,
) -> str:
    """Map keyword or Google Maps type to category_group."""
    if groups is None:
        groups = get_category_groups()

    search_text = f"{keyword} {raw_type or ''}".lower()

    for group_name, keywords in groups.items():
        for kw in keywords:
            if kw.lower() in search_text:
                return group_name

    # Default fallback
    return "lainnya"
