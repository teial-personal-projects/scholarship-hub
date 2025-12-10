"""
Python scrapers package for the scholarship tracker system.
"""

from .base_scraper import BaseScraper
from .careeronestop_scraper import CareerOneStopScraper
from .collegescholarship_scraper import CollegeScholarshipScraper
from .general_scraper import GeneralScraper

__all__ = [
    'BaseScraper',
    'CareerOneStopScraper',
    'CollegeScholarshipScraper',
    'GeneralScraper',
]
