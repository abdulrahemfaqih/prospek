"""Unit tests for lead scoring module."""

import pytest
from prospek.scoring import calculate_lead_score


class TestCalculateLeadScore:
    def test_ideal_lead_capped_at_100(self):
        # No website (40) + Rating 4.8 (15) + Reviews 150 (15) + WA (15) + Persewaan (10)
        # Sum = 95 -> capped at 100
        score = calculate_lead_score(
            has_website=False,
            website_kind="none",
            rating=4.8,
            reviews_count=150,
            wa_number="628123456789",
            category_group="persewaan",
        )
        assert score == 95

    def test_social_only_website_with_accommodation(self):
        # Social (30) + Rating 4.6 (15) + Reviews 80 (15) + WA (15) + Akomodasi (10)
        # Sum = 85
        score = calculate_lead_score(
            has_website=False,
            website_kind="social",
            rating=4.6,
            reviews_count=80,
            wa_number="628123456789",
            category_group="akomodasi",
        )
        assert score == 85

    def test_business_with_own_website(self):
        # Own website (0) + Rating 4.5 (15) + Reviews 100 (15) + WA (15) + Makanan (0)
        # Sum = 45
        score = calculate_lead_score(
            has_website=True,
            website_kind="own",
            rating=4.5,
            reviews_count=100,
            wa_number="628123456789",
            category_group="makanan",
        )
        assert score == 45

    def test_moderate_rating_and_reviews_bracket(self):
        # No website (40) + Rating 3.7 (7) + Reviews 35 (8) + No WA (0) + Jasa (0)
        # Sum = 55
        score = calculate_lead_score(
            has_website=False,
            website_kind="none",
            rating=3.7,
            reviews_count=35,
            wa_number=None,
            category_group="jasa",
        )
        assert score == 55

    def test_low_reputation_with_own_website(self):
        # Own website (0) + Rating 3.2 (0) + Reviews 5 (0) + No WA (0) + Lainnya (0)
        # Sum = 0
        score = calculate_lead_score(
            has_website=True,
            website_kind="own",
            rating=3.2,
            reviews_count=5,
            wa_number=None,
            category_group="lainnya",
        )
        assert score == 0

    def test_cap_does_not_exceed_100(self):
        # Theoretical score > 100 (if weights sum higher)
        custom_cfg = {
            "no_website": 60,
            "rating_gte_4": 30,
            "reviews_gte_50": 30,
            "has_wa": 20,
            "priority_category": 20,
            "priority_groups": ["persewaan"],
            "max_score": 100,
        }
        score = calculate_lead_score(
            has_website=False,
            website_kind="none",
            rating=4.9,
            reviews_count=200,
            wa_number="628123456789",
            category_group="persewaan",
            scoring_cfg=custom_cfg,
        )
        assert score == 100
