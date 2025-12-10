#!/usr/bin/env python3
"""
Base scraper class for all scholarship scrapers
"""

import os
import time
import logging
import uuid
from abc import ABC, abstractmethod
from typing import List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

from ..utils_python import Scholarship, ScrapingResult, ScrapingMetadata
from .constants import SCRAPER_MIN_REQUEST_DELAY_SEC, MAX_CAREERONESTOP_PAGES
from ..utils_python.database_manager import DatabaseManagerFactory

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base class for all scrapers"""
    
    def __init__(self, 
                 scholarships_table: str = "",
                 jobs_table: str = "",
                 job_id: str = "",
                 environment: str = "local",
                 raw_data_bucket: Optional[str] = None,
                 max_pages: Optional[int] = None):
        self.scholarships_table = scholarships_table
        self.jobs_table = jobs_table
        self.job_id = job_id
        self.environment = environment
        self.raw_data_bucket = raw_data_bucket
        # Pagination control (centralized). Env var SCRAPER_MAX_PAGES can set default.
        try:
            env_max_pages = int(os.getenv('SCRAPER_MAX_PAGES')) if os.getenv('SCRAPER_MAX_PAGES') else None
        except Exception:
            env_max_pages = None
        
        # Set max_pages: use parameter if valid, else env var if valid, else default to 3
        if isinstance(max_pages, int) and max_pages > 0:
            self.max_pages = max_pages
        elif isinstance(env_max_pages, int) and env_max_pages > 0:
            self.max_pages = env_max_pages
        else:
            self.max_pages = MAX_CAREERONESTOP_PAGES
        
        # Create database manager using factory
        self.db_manager = DatabaseManagerFactory.create_database_manager(environment)
        
        # Rate limiting
        self.last_call_time = 0
        self.min_delay = SCRAPER_MIN_REQUEST_DELAY_SEC  # Minimum delay between requests
    
    def _rate_limit(self):
        """Implement simple per-instance rate limiting between requests.

        Behavior:
            Ensures at least `self.min_delay` seconds elapse between calls by
            sleeping the remainder when called too quickly.
        """
        current_time = time.time()
        time_since_last = current_time - self.last_call_time
        
        if time_since_last < self.min_delay:
            sleep_time = self.min_delay - time_since_last
            time.sleep(sleep_time)
        
        self.last_call_time = time.time()
    
    def get_db_connection(self):
        """Get database connection from the database manager.

        Returns:
            A live DB connection (established on-demand) or None on failure.
        """
        return self.db_manager.get_connection()
    
    def close_db_connection(self):
        """Close database connection if open."""
        self.db_manager.disconnect()
    
    def create_scholarship_id(self) -> str:
        """Generate a unique scholarship ID.

        Note:
            Retained for compatibility, but DB AUTO_INCREMENT is the source of
            truth for `scholarship_id` in current design.
        """
        return f"sch_{uuid.uuid4().hex[:16]}"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def save_scholarship(self, scholarship: Scholarship) -> bool:
        """Save a scholarship using the configured database manager.

        Parameters:
            scholarship: The populated `Scholarship` domain object to persist.

        Returns:
            True if the operation succeeded (insert or upsert), otherwise raises
            an exception propagated from the DB layer.
        """
        try:
            return self.db_manager.save_scholarship(scholarship)
        except Exception as e:
            logger.error(f"Error saving scholarship: {e}")
            raise
    
    def update_job_status(self, status: str, metadata: ScrapingMetadata):
        """Update job status in the backing store via the database manager.

        Parameters:
            status: One of 'running', 'completed', or 'failed'.
            metadata: `ScrapingMetadata` with counts and context; `website` will
                be auto-filled from the scraper class name if missing.
        """
        # Ensure website is populated for downstream logging/DB writes
        try:
            if hasattr(metadata, 'website') and (not metadata.website or not str(metadata.website).strip()):
                metadata.website = self.__class__.__name__.replace('Scraper', '').lower()
        except Exception:
            pass
        self.db_manager.update_job_status(status, metadata)
    
    def clean_text(self, text: str, max_length: Optional[int] = None) -> str:
        """Clean and truncate text"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Truncate if needed
        if max_length and len(text) > max_length:
            text = text[:max_length-3] + "..."
        
        return text
    
    def extract_amount(self, text: str) -> Optional[float]:
        """Extract monetary amount from text"""
        import re
        
        if not text:
            return None
        
        # Look for dollar amounts
        pattern = r'\$?([0-9,]+(?:\.[0-9]{2})?)'
        matches = re.findall(pattern, text)
        
        if matches:
            # Take the largest amount found
            amounts = [float(match.replace(',', '')) for match in matches]
            return max(amounts)
        
        return None
    
    @abstractmethod
    def scrape(self) -> ScrapingResult:
        """Main scraping method implemented by subclasses.

        Returns:
            A `ScrapingResult` containing scholarships, errors, and metadata.
        """
        pass
    
    def run(self) -> ScrapingResult:
        """Main entry point orchestrating status updates and error handling.

        Behavior:
            - Marks job 'running' with website and job_id context
            - Invokes `scrape()` and enriches metadata
            - Marks job 'completed' or 'failed' accordingly and returns a
              well-formed `ScrapingResult` on both success and failure paths.
        """
        logger.info(f"Starting {self.__class__.__name__}")
        
        try:
            # Create metadata with job information
            job_metadata = ScrapingMetadata()
            job_metadata.job_id = self.job_id
            website_name = self.__class__.__name__.replace('Scraper', '').lower()
            job_metadata.website = website_name
            logger.debug(f"Setting website name: {website_name} for class: {self.__class__.__name__}")
            
            # Update job status to running
            self.update_job_status('running', job_metadata)
            
            # Perform scraping
            result = self.scrape()
            
            # Add job information to result metadata
            if hasattr(result.metadata, '__dict__'):
                result.metadata.job_id = self.job_id
                result.metadata.website = self.__class__.__name__.replace('Scraper', '').lower()
                completed_metadata = result.metadata
            elif isinstance(result.metadata, dict):
                result.metadata['job_id'] = self.job_id
                result.metadata['website'] = self.__class__.__name__.replace('Scraper', '').lower()
                # Convert dict to ScrapingMetadata object
                completed_metadata = ScrapingMetadata(
                    records_found=result.metadata.get('total_found', 0),
                    records_processed=result.metadata.get('total_processed', 0),
                    records_inserted=result.metadata.get('total_inserted', 0),
                    records_updated=result.metadata.get('total_updated', 0),
                    job_id=result.metadata.get('job_id'),
                    website=result.metadata.get('website'),
                    errors=result.metadata.get('errors', [])
                )
            else:
                # Fallback: create basic metadata
                completed_metadata = ScrapingMetadata(
                    job_id=self.job_id,
                    website=self.__class__.__name__.replace('Scraper', '').lower()
                )
            
            # Update job status to completed
            self.update_job_status('completed', completed_metadata)
            
            logger.info(f"Scraping completed successfully. Found {len(result.scholarships)} scholarships")
            return result
            
        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            
            # Create metadata with job information for failed status
            failed_metadata = ScrapingMetadata(errors=[str(e)])
            failed_metadata.job_id = self.job_id
            failed_metadata.website = self.__class__.__name__.replace('Scraper', '').lower()
            
            self.update_job_status('failed', failed_metadata)
            
            # Return a proper ScrapingResult instead of raising the exception
            return ScrapingResult(
                success=False,
                scholarships=[],
                errors=[str(e)],
                metadata={
                    'job_id': self.job_id,
                    'website': self.__class__.__name__.replace('Scraper', '').lower(),
                    'total_found': 0,
                    'total_processed': 0,
                    'total_inserted': 0,
                    'total_updated': 0
                }
            )
        finally:
            # Clean up database connection
            self.close_db_connection()
