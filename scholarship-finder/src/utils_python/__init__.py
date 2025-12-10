"""
Python utilities package for the scholarship tracker scraper system.
"""

from .config_manager import get_scraper_type
from .scholarship_types import Scholarship, ScrapingResult, ScrapingMetadata
from .shared_keywords import (
    SCHOLARSHIP_KEYWORDS,
    ACADEMIC_LEVEL_KEYWORDS,
    FIELD_OF_STUDY_KEYWORDS,
    DEMOGRAPHIC_KEYWORDS,
    GEOGRAPHIC_KEYWORDS,
    get_keywords_by_category
)
from .helper import normalize_deadline_value

__all__ = [
    # Config manager
    'get_scraper_type',
    
    # Types
    'Scholarship',
    'ScrapingResult', 
    'ScrapingMetadata',
    
    # Keywords
    'SCHOLARSHIP_KEYWORDS',
    'ACADEMIC_LEVEL_KEYWORDS',
    'FIELD_OF_STUDY_KEYWORDS',
    'DEMOGRAPHIC_KEYWORDS',
    'GEOGRAPHIC_KEYWORDS',
    'get_keywords_by_category',
    
    # Data normalization
    'normalize_deadline_value',
]
