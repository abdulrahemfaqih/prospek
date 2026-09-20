"""Configuration loader for Prospek scraper."""

import os
from pathlib import Path
from typing import Any, Dict, List
import yaml
from dotenv import load_dotenv

# Load scraper/.env if present
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
else:
    # Fallback to root .env if running from workspace root
    load_dotenv(BASE_DIR.parent / ".env")
    load_dotenv(BASE_DIR.parent / ".env.local")

CONFIG_YAML_PATH = BASE_DIR / "config.yaml"


def load_yaml_config() -> Dict[str, Any]:
    """Load configuration from config.yaml."""
    if not CONFIG_YAML_PATH.exists():
        raise FileNotFoundError(f"Config file not found at {CONFIG_YAML_PATH}")
    with open(CONFIG_YAML_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


_config_cache: Dict[str, Any] | None = None


def get_config() -> Dict[str, Any]:
    """Get cached YAML config."""
    global _config_cache
    if _config_cache is None:
        _config_cache = load_yaml_config()
    return _config_cache


def get_serpapi_key() -> str:
    """Get SerpApi API key from environment."""
    key = os.environ.get("SERPAPI_API_KEY", "").strip()
    return key


def get_supabase_url() -> str:
    """Get Supabase project URL from environment."""
    return os.environ.get("SUPABASE_URL", "").strip()


def get_supabase_service_role_key() -> str:
    """Get Supabase service role key from environment."""
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def get_provinces() -> Dict[str, Dict[str, Any]]:
    """Return dictionary of provinces and their cities."""
    return get_config().get("provinces", {})


def get_category_groups() -> Dict[str, List[str]]:
    """Return dictionary of category groups and their keywords."""
    return get_config().get("category_groups", {})


def get_blocklist_chains() -> List[str]:
    """Return list of chain business names to filter out."""
    return get_config().get("blocklist_chains", [])


def get_social_domains() -> List[str]:
    """Return list of domains classified as social media / marketplace."""
    return get_config().get("social_domains", [])


def get_scoring_config() -> Dict[str, Any]:
    """Return scoring weights configuration."""
    return get_config().get("scoring", {})


def get_serpapi_limits() -> Dict[str, Any]:
    """Return SerpApi rate limit and quota settings."""
    return get_config().get("serpapi", {})
