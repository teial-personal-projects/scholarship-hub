#!/usr/bin/env python3
"""
Centralized constants for Python scrapers
"""

# Google Custom Search: number of results to request per query (max 10 by API)
MAX_GOOGLE_SEARCH_RESULTS = 5

# Default number of sources to keep per category during discovery
MAX_SOURCES_PER_CATEGORY_DEFAULT = 10

# Google Custom Search API limits and retry/backoff settings
GOOGLE_CSE_MAX_RESULTS = 10  # API hard limit per request
GOOGLE_MAX_RETRIES = 3       # Retry attempts on transient errors (e.g., 429)
GOOGLE_BACKOFF_BASE_DELAY_SEC = 5  # Base delay seconds for exponential backoff
GOOGLE_MIN_INTERVAL_BETWEEN_REQUESTS_SEC = 3.0  # Throttle between requests

# Generic scraper request throttling (per-scraper minimum delay between requests)
SCRAPER_MIN_REQUEST_DELAY_SEC = 1.0

MAX_CAREERONESTOP_PAGES = 5


