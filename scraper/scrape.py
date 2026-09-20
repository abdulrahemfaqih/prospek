#!/usr/bin/env python3
"""Prospek CLI: Entry point for running business scraper."""

import sys
from pathlib import Path

# Ensure scraper package is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from prospek.cli import main

if __name__ == "__main__":
    main()
