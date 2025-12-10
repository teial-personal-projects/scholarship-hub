#!/usr/bin/env python3
"""
AI Discovery Scraper
Integrates ethical crawling, AI-powered source discovery, and content extraction
"""

import os
import time
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
from .base_scraper import BaseScraper
from .ethical_crawler import EthicalCrawler, CrawlConfig

# AI Discovery Scraper Configuration Constants
# These read from the same environment variables as server/src/utils/constants.ts
# Default values match the TypeScript constants
MAX_SOURCES_PER_CATEGORY = int(os.getenv('AI_DISCOVERY_MAX_SOURCES_PER_CATEGORY', '5'))
MAX_SCHOLARSHIPS_PER_SOURCE = int(os.getenv('AI_DISCOVERY_MAX_SCHOLARSHIPS_PER_SOURCE', '3'))
MAX_GOOGLE_REQUESTS = int(os.getenv('AI_DISCOVERY_MAX_GOOGLE_REQUESTS', '20'))

# Conservative rate limiting delays (in seconds)
CONSERVATIVE_CATEGORY_DELAY = int(os.getenv('AI_DISCOVERY_CONSERVATIVE_CATEGORY_DELAY', '30'))
CONSERVATIVE_CRAWL_DELAY = int(os.getenv('AI_DISCOVERY_CONSERVATIVE_CRAWL_DELAY', '10'))
CONSERVATIVE_EXTRACTION_DELAY = int(os.getenv('AI_DISCOVERY_CONSERVATIVE_EXTRACTION_DELAY', '5'))

# Standard rate limiting delays (in seconds)
STANDARD_CATEGORY_DELAY = int(os.getenv('AI_DISCOVERY_STANDARD_CATEGORY_DELAY', '15'))
STANDARD_CRAWL_DELAY = int(os.getenv('AI_DISCOVERY_STANDARD_CRAWL_DELAY', '8'))
STANDARD_EXTRACTION_DELAY = int(os.getenv('AI_DISCOVERY_STANDARD_EXTRACTION_DELAY', '3'))
from .source_discovery_engine import SourceDiscoveryEngine
from .content_extraction_pipeline import ContentExtractionPipeline, ExtractedScholarship
from .config.config_loader import SourceCategoryConfig
from ..utils_python import ScrapingResult, Scholarship

logger = logging.getLogger(__name__)

@dataclass
class DiscoveryStats:
    """Statistics for the discovery process"""
    total_sources_discovered: int
    total_scholarships_extracted: int
    categories_searched: int
    processing_time: float
    sources_by_category: Dict[str, int]
    scholarships_by_category: Dict[str, int]

class AIDiscoveryScraper(BaseScraper):
    """AI-powered scholarship discovery scraper"""
    
    def __init__(self, 
                 openai_api_key: str,
                 google_api_key: str,
                 google_cse_id: str,
                 max_sources_per_category: int = MAX_SOURCES_PER_CATEGORY,
                 max_scholarships_per_source: int = MAX_SCHOLARSHIPS_PER_SOURCE,
                 conservative_rate_limiting: bool = True,
                 max_google_requests: int = MAX_GOOGLE_REQUESTS):
        
        super().__init__()
        
        # Initialize components
        self.discovery_engine = SourceDiscoveryEngine(
            openai_api_key=openai_api_key,
            google_api_key=google_api_key,
            google_cse_id=google_cse_id
        )
        
        self.crawler = EthicalCrawler(CrawlConfig())
        self.extraction_pipeline = ContentExtractionPipeline(openai_api_key)
        self.config = SourceCategoryConfig()
        
        # Configuration
        self.max_sources_per_category = max_sources_per_category
        self.max_scholarships_per_source = max_scholarships_per_source
        self.conservative_rate_limiting = conservative_rate_limiting
        self.max_google_requests = max_google_requests
        self.google_requests_made = 0  # Track Google API calls
        
        # Rate limiting delays
        if self.conservative_rate_limiting:
            self.category_delay = CONSERVATIVE_CATEGORY_DELAY
            self.crawl_delay = CONSERVATIVE_CRAWL_DELAY
            self.extraction_delay = CONSERVATIVE_EXTRACTION_DELAY
        else:
            self.category_delay = STANDARD_CATEGORY_DELAY
            self.crawl_delay = STANDARD_CRAWL_DELAY
            self.extraction_delay = STANDARD_EXTRACTION_DELAY
        
        # Statistics
        self.stats = DiscoveryStats(
            total_sources_discovered=0,
            total_scholarships_extracted=0,
            categories_searched=0,
            processing_time=0.0,
            sources_by_category={},
            scholarships_by_category={}
        )
    
    def scrape(self, categories: Optional[List[str]] = None) -> ScrapingResult:
        """Discover, crawl, extract, and persist scholarships.

        Parameters:
            categories: Optional list of category IDs to focus discovery.

        Returns:
            `ScrapingResult` reporting counts, any errors, and scholarships
            extracted and handed to the DB layer for persistence.
        """
        
        start_time = time.time()
        logger.info("Starting AI discovery scraper")
        
        try:
            # Stage 1: Discovery
            logger.info("Stage 1: Discovering scholarship sources...")
            discovered_sources = self._discover_sources(categories)
            
            # Stage 2: Crawling
            logger.info("Stage 2: Crawling discovered sources...")
            crawled_pages = self._crawl_sources(discovered_sources)
            
            # Stage 3: Extraction
            logger.info("Stage 3: Extracting scholarship data...")
            extracted_scholarships = self._extract_scholarships(crawled_pages)
            
            # Stage 4: Processing and saving
            logger.info("Stage 4: Processing and saving scholarships...")
            inserted = 0
            updated = 0
            errors = []
            
            for scholarship in extracted_scholarships:
                try:
                    if self.save_scholarship(scholarship):
                        inserted += 1
                    else:
                        updated += 1
                except Exception as e:
                    error_msg = f"Error saving scholarship {scholarship.title}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            # Update statistics
            self.stats.processing_time = time.time() - start_time
            self.stats.total_sources_discovered = len(discovered_sources)
            self.stats.total_scholarships_extracted = len(extracted_scholarships)
            
            logger.info(f"Scraping complete: {len(extracted_scholarships)} scholarships extracted")
            
            # Convert ExtractedScholarship objects to Scholarship objects
            scholarships = []
            for extracted_scholarship in extracted_scholarships:
                scholarship = Scholarship(
                    title=extracted_scholarship.title,
                    description=extracted_scholarship.description,
                    organization=extracted_scholarship.organization,
                    min_award=extracted_scholarship.amount,
                    max_award=extracted_scholarship.amount,
                    deadline=extracted_scholarship.deadline,
                    eligibility=extracted_scholarship.eligibility,
                    apply_url=extracted_scholarship.application_url,
                    source_url=extracted_scholarship.source_url,
                    source="AI Discovery",
                    country="US",
                    active=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                scholarships.append(scholarship)
            
            return ScrapingResult(
                success=True,
                scholarships=scholarships,
                errors=errors,
                metadata={
                    'total_found': len(extracted_scholarships),
                    'total_processed': len(extracted_scholarships),
                    'total_inserted': inserted,
                    'total_updated': updated,
                    'processing_time': self.stats.processing_time,
                    'sources_discovered': self.stats.total_sources_discovered,
                    'categories_searched': self.stats.categories_searched
                }
            )
            
        except Exception as e:
            error_msg = f"AI discovery scraper failed: {str(e)}"
            logger.error(error_msg)
            
            return ScrapingResult(
                success=False,
                scholarships=[],
                errors=[error_msg],
                metadata={
                    'total_found': 0,
                    'total_processed': 0,
                    'total_inserted': 0,
                    'total_updated': 0,
                    'processing_time': time.time() - start_time,
                    'sources_discovered': 0,
                    'categories_searched': 0
                }
            )
    
    def _discover_sources(self, categories: Optional[List[str]] = None) -> List:
        """Delegate to discovery engine to find candidate scholarship sources.

        Parameters:
            categories: Optional subset of categories to search; falls back to
                configuration if unspecified.

        Returns:
            A list of verified sources (engine-typed objects) to crawl next.
        """
        
        if categories is None:
            categories = self.config.get_category_ids()
        
        self.stats.categories_searched = len(categories)
        logger.info(f"Discovering sources for {len(categories)} categories")
        
        all_sources = []
        
        for category_id in categories:
            # Check Google API quota before each category
            if not self._check_google_quota():
                logger.warning(f"Stopping discovery due to Google API quota limit. Processed {len(all_sources)} sources so far.")
                break
                
            try:
                sources = self.discovery_engine.discover_sources(
                    categories=[category_id],
                    max_sources_per_category=self.max_sources_per_category
                )
                
                # Increment Google API request counter
                self._increment_google_requests()
                
                all_sources.extend(sources)
                self.stats.sources_by_category[category_id] = len(sources)
                
                logger.info(f"Discovered {len(sources)} sources for {category_id}")
                
                # Rate limiting between categories
                time.sleep(self.category_delay)
                
            except Exception as e:
                logger.error(f"Error discovering sources for {category_id}: {e}")
                continue
        
        return all_sources
    
    def _crawl_sources(self, sources: List) -> List[Dict]:
        """Crawl verified sources to retrieve page content for extraction.

        Parameters:
            sources: Verified discovery results to crawl.

        Returns:
            A list of dicts with url, title, content, category, and confidence.
        """
        
        crawled_pages = []
        
        for source in sources:
            try:
                logger.info(f"Crawling: {source.url}")
                
                # Crawl the source URL
                crawl_result = self.crawler.crawl_url(source.url)
                
                if crawl_result and crawl_result.get('content'):
                    crawled_pages.append({
                        'url': source.url,
                        'title': source.title,
                        'content': crawl_result['content'],
                        'category': source.category,
                        'confidence': source.confidence
                    })
                
                # Rate limiting
                time.sleep(self.crawl_delay)
                
            except Exception as e:
                logger.error(f"Error crawling {source.url}: {e}")
                continue
        
        return crawled_pages
    
    def _extract_scholarships(self, crawled_pages: List[Dict]) -> List[ExtractedScholarship]:
        """Extract structured scholarships from crawled HTML content.

        Parameters:
            crawled_pages: Page payloads returned by the crawler containing
                the fetched content and metadata.

        Returns:
            A list of `ExtractedScholarship` ready to be mapped to DB models.
        """
        
        all_scholarships = []
        
        for page in crawled_pages:
            try:
                logger.info(f"Extracting scholarships from: {page['url']}")
                
                # Extract scholarships from page content
                extraction_result = self.extraction_pipeline.extract_scholarships(
                    content=page['content'],
                    source_url=page['url'],
                    category=page['category']
                )
                
                if extraction_result.success and extraction_result.scholarships:
                    all_scholarships.extend(extraction_result.scholarships)
                    
                    # Update statistics
                    category = page['category']
                    if category not in self.stats.scholarships_by_category:
                        self.stats.scholarships_by_category[category] = 0
                    self.stats.scholarships_by_category[category] += len(extraction_result.scholarships)
                
                # Rate limiting
                time.sleep(self.extraction_delay)
                
            except Exception as e:
                logger.error(f"Error extracting scholarships from {page['url']}: {e}")
                continue
        
        return all_scholarships
    
    def _check_google_quota(self) -> bool:
        """Check if we can make more Google API requests"""
        if self.google_requests_made >= self.max_google_requests:
            logger.warning(f"Reached maximum Google API requests ({self.max_google_requests}). Stopping discovery.")
            return False
        return True
    
    def _increment_google_requests(self):
        """Increment Google API request counter"""
        self.google_requests_made += 1
        logger.debug(f"Google API requests made: {self.google_requests_made}/{self.max_google_requests}")
    
    
    
    def _process_scholarships(self, scholarships: List[ExtractedScholarship]):
        """Process and save extracted scholarships"""
        
        for scholarship in scholarships:
            try:
                # Save to database
                self._save_scholarship_to_db(scholarship)
                
            except Exception as e:
                logger.error(f"Error saving scholarship {scholarship.title}: {e}")
                continue
    
    def _save_scholarship_to_db(self, scholarship: ExtractedScholarship):
        """Save a scholarship to the database"""
        
        # This is a placeholder - implement actual database saving logic
        # based on your database schema and requirements
        
        query = """
        INSERT INTO scholarships (
            title, description, amount, deadline, eligibility, 
            application_url, source_url, category, extracted_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = (
            scholarship.title,
            scholarship.description,
            scholarship.amount,
            scholarship.deadline,
            scholarship.eligibility,
            scholarship.application_url,
            scholarship.source_url,
            scholarship.category,
            scholarship.extracted_at
        )
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, values)
                    conn.commit()
                    
            logger.info(f"Saved scholarship: {scholarship.title}")
            
        except Exception as e:
            logger.error(f"Database error saving scholarship: {e}")
            raise
    
    def get_statistics(self) -> DiscoveryStats:
        """Get scraping statistics"""
        return self.stats
    
    def get_config_info(self) -> Dict:
        """Get information about the current configuration"""
        return {
            'categories': self.config.get_all_categories(),
            'total_categories': len(self.config.get_all_categories()),
            'discovery_stats': self.discovery_engine.get_discovery_statistics()
        }
