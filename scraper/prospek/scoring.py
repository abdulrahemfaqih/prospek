"""Lead scoring calculator for prospective clients."""

from typing import Any, Dict, Optional
from .config import get_scoring_config


def calculate_lead_score(
    has_website: bool,
    website_kind: str,
    rating: Optional[float],
    reviews_count: Optional[int],
    wa_number: Optional[str],
    category_group: Optional[str],
    scoring_cfg: Optional[Dict[str, Any]] = None,
) -> int:
    """Calculate lead score (0-100) based on prospective client value.

    Logic:
    - Businesses with good reputation (high rating & reviews) but lacking their
      own website are the best prospects (+40 for no website, +30 for social-only).
    - WhatsApp number availability (+15) ensures easy direct outreach.
    - Rental and accommodation categories (+10) have higher demand for online catalogs.
    """
    if scoring_cfg is None:
        scoring_cfg = get_scoring_config()

    score = 0

    # 1. Website status (+40 or +30)
    w_kind = (website_kind or "none").lower()
    if w_kind == "none" or not has_website and w_kind != "social":
        score += scoring_cfg.get("no_website", 40)
    elif w_kind == "social":
        score += scoring_cfg.get("social_website", 30)

    # 2. Rating (+15 or +7)
    if rating is not None:
        try:
            r = float(rating)
            if r >= 4.0:
                score += scoring_cfg.get("rating_gte_4", 15)
            elif 3.5 <= r < 4.0:
                score += scoring_cfg.get("rating_35_39", 7)
        except (ValueError, TypeError):
            pass

    # 3. Reviews count (+15 or +8)
    if reviews_count is not None:
        try:
            rev = int(reviews_count)
            if rev >= 50:
                score += scoring_cfg.get("reviews_gte_50", 15)
            elif 20 <= rev < 50:
                score += scoring_cfg.get("reviews_20_49", 8)
        except (ValueError, TypeError):
            pass

    # 4. WhatsApp availability (+15)
    if wa_number and str(wa_number).strip():
        score += scoring_cfg.get("has_wa", 15)

    # 5. Priority category (+10)
    priority_groups = scoring_cfg.get("priority_groups", ["persewaan", "akomodasi"])
    cat_grp = (category_group or "").lower()
    if cat_grp in priority_groups:
        score += scoring_cfg.get("priority_category", 10)

    # Upper bound cap
    max_score = scoring_cfg.get("max_score", 100)
    return max(0, min(score, max_score))
