import os
import logging
from typing import Dict, Type, Optional

from .base_scraper import BaseScraper
from .careeronestop_scraper import CareerOneStopScraper
from .collegescholarship_scraper import CollegeScholarshipScraper
# from .general_scraper import GeneralScraper
from .ai_discovery_scraper import AIDiscoveryScraper
from ..utils_python import ScrapingResult
from ..utils_python import get_scraper_type

logger = logging.getLogger(__name__)

"""
Scraper Factory Architecture History:

Originally, the scholarship tracker was designed with AWS infrastructure:
- TypeScript scrapers running on AWS Batch with Fargate
- AWS RDS for database storage
- AWS S3 for raw data storage
- AWS Lambda for orchestration
- AWS EventBridge for scheduling

However, this architecture proved expensive for a personal/educational project:
- AWS Batch costs: ~$50-100/month for regular scraping
- AWS RDS costs: ~$30-50/month for database
- AWS S3 costs: ~$10-20/month for storage
- Total: ~$90-170/month

To reduce costs, the system was redesigned to use:
- Python scrapers running locally
- Local MySQL database
- Local file system storage
- Direct script execution instead of containerized batch jobs

This reduced costs from ~$90-170/month to ~$0/month (local development only).

The factory pattern supports both architectures:
- Python scrapers: For local development and cost-effective operation
- TypeScript scrapers: For future AWS deployment if needed

The get_scraper_type() function determines which scraper type to use based on:
- Environment configuration (local vs production)
- Available resources (local Python vs AWS infrastructure)
- Cost considerations (local vs cloud)
"""


class ScraperFactory:
    """Factory for creating scrapers based on configuration"""
    
    # Registry of available scrapers
    # Note: All current scrapers are Python-based for cost efficiency
    # The original AWS TypeScript scrapers are preserved for future cloud deployment
    _scrapers: Dict[str, Type[BaseScraper]] = {
        # CareerOneStop scrapers (Python implementation)
        'careeronestop': CareerOneStopScraper,
        
        # CollegeScholarship scrapers (Python implementation)
        'collegescholarship': CollegeScholarshipScraper,
        
        # AI-powered discovery scrapers (Python implementation)
        'ai_discovery': AIDiscoveryScraper
    }
    
    @classmethod
    def register_scraper(cls, name: str, scraper_class: Type[BaseScraper]):
        """Register a new scraper"""
        cls._scrapers[name] = scraper_class
        logger.info(f"Registered scraper: {name}")
    
    @classmethod
    def get_available_scrapers(cls) -> list:
        """Get list of available scraper names"""
        return list(cls._scrapers.keys())
    
    @classmethod
    def create_scraper(cls, 
                      scraper_name: str,
                      scholarships_table: str = "",
                      jobs_table: str = "",
                      job_id: str = "",
                      environment: str = "local",
                      raw_data_bucket: Optional[str] = None) -> Optional[BaseScraper]:
        """Create a scraper instance"""
        
        # Get the scraper type from configuration
        scraper_type = get_scraper_type(scraper_name, environment)
        logger.info(f"Scraper type for {scraper_name}: {scraper_type}")
        
        # Check if it's a Python scraper
        if scraper_type == "python" and scraper_name.lower() in cls._scrapers:
            scraper_class = cls._scrapers[scraper_name.lower()]
            logger.info(f"Creating Python scraper: {scraper_name}")
            
            # Special handling for AI discovery scraper
            if scraper_name.lower() == 'ai_discovery':
                # Get API keys from environment
                openai_key = os.getenv('OPENAI_API_KEY')
                google_key = os.getenv('GOOGLE_API_KEY')
                google_cse = os.getenv('GOOGLE_CUSTOM_SEARCH_CX')
                
                if not all([openai_key, google_key, google_cse]):
                    logger.error("❌ Missing required API keys for AI discovery scraper")
                    logger.error("   Required: OPENAI_API_KEY, GOOGLE_API_KEY, GOOGLE_CUSTOM_SEARCH_CX")
                    logger.error("   Set these in your .env file")
                    return None
                
                return scraper_class(
                    openai_api_key=openai_key,
                    google_api_key=google_key,
                    google_cse_id=google_cse,
                    max_sources_per_category=10,
                    max_scholarships_per_source=5
                )
            
            # Standard scraper creation
            return scraper_class(
                scholarships_table=scholarships_table,
                jobs_table=jobs_table,
                job_id=job_id,
                environment=environment,
                raw_data_bucket=raw_data_bucket
            )
        
        # Check if it's a TypeScript scraper
        elif scraper_type == "typescript":
            logger.info(f"Creating TypeScript scraper: {scraper_name}")
            return cls._create_typescript_scraper(
                scraper_name=scraper_name,
                scholarships_table=scholarships_table,
                jobs_table=jobs_table,
                job_id=job_id,
                environment=environment,
                raw_data_bucket=raw_data_bucket
            )
        
        else:
            available_scrapers = list(cls._scrapers.keys())
            logger.error(f"❌ Unknown scraper: '{scraper_name}'")
            logger.error(f"   Available scrapers: {', '.join(available_scrapers)}")
            logger.error(f"   Try: python main.py --list")
            logger.error(f"   Or use one of these common names:")
            logger.error(f"     - 'careeronestop' (CareerOneStop)")
            logger.error(f"     - 'collegescholarship' (CollegeScholarship)")
            logger.error(f"     - 'ai_discovery' (AI Discovery)")
            return None
    
    @classmethod
    def _create_typescript_scraper(cls, **kwargs):
        """
        Create TypeScript scraper (placeholder for cloud deployment)
        
        Note: TypeScript scrapers were originally designed for AWS Batch deployment
        but are currently disabled to save costs. They would be re-enabled for:
        - Production cloud deployment
        - High-volume scraping requirements
        - When budget allows for AWS infrastructure costs
        
        Original AWS architecture:
        - TypeScript scrapers in Docker containers
        - AWS Batch for job orchestration
        - AWS Fargate for serverless compute
        - AWS RDS for database storage
        - AWS S3 for raw data storage
        
        Cost considerations:
        - AWS Batch: ~$50-100/month for regular scraping
        - AWS RDS: ~$30-50/month for database
        - AWS S3: ~$10-20/month for storage
        - Total: ~$90-170/month vs $0/month for local Python scrapers
        """
        # This would be implemented to call the TypeScript scrapers
        # For now, return None to indicate TypeScript scrapers aren't available locally
        logger.warning("TypeScript scrapers are not available in local mode")
        logger.info("TypeScript scrapers were disabled to reduce AWS costs (~$90-170/month)")
        logger.info("Use Python scrapers for local development and cost-effective operation")
        return None


class ScraperOrchestrator:
    """Orchestrates multiple scrapers"""
    
    def __init__(self, environment: str = "local"):
        self.environment = environment
        self.factory = ScraperFactory()
    
    def run_scraper(self, 
                   scraper_name: str,
                   scholarships_table: str = "",
                   jobs_table: str = "",
                   job_id: str = "",
                   raw_data_bucket: Optional[str] = None) -> ScrapingResult:
        """Run a specific scraper"""
        
        scraper = self.factory.create_scraper(
            scraper_name=scraper_name,
            scholarships_table=scholarships_table,
            jobs_table=jobs_table,
            job_id=job_id,
            environment=self.environment,
            raw_data_bucket=raw_data_bucket
        )
        
        if scraper is None:
            return ScrapingResult(
                success=False,
                scholarships=[],
                errors=[f"Could not create scraper: {scraper_name}"],
                metadata={'total_found': 0, 'total_processed': 0, 'total_inserted': 0, 'total_updated': 0}
            )
        
        return scraper.run()
    
    def run_all_scrapers(self, 
                        scholarships_table: str = "",
                        jobs_table: str = "",
                        job_id: str = "",
                        raw_data_bucket: Optional[str] = None) -> Dict[str, ScrapingResult]:
        """Run all available scrapers"""
        
        results = {}
        available_scrapers = self.factory.get_available_scrapers()
        
        for scraper_name in available_scrapers:
            logger.info(f"Running scraper: {scraper_name}")
            result = self.run_scraper(
                scraper_name=scraper_name,
                scholarships_table=scholarships_table,
                jobs_table=jobs_table,
                job_id=job_id,
                raw_data_bucket=raw_data_bucket
            )
            results[scraper_name] = result
        
        return results


# Convenience functions for easy access
def get_scraper(scraper_name: str, **kwargs) -> Optional[BaseScraper]:
    """Get a scraper instance"""
    return ScraperFactory.create_scraper(scraper_name, **kwargs)


def run_scraper(scraper_name: str, **kwargs) -> ScrapingResult:
    """Run a scraper and return results"""
    scraper = get_scraper(scraper_name, **kwargs)
    if scraper:
        return scraper.run()
    else:
        return ScrapingResult(
            success=False,
            scholarships=[],
            errors=[f"Could not create scraper: {scraper_name}"],
            metadata={'total_found': 0, 'total_processed': 0, 'total_inserted': 0, 'total_updated': 0}
        )


def list_available_scrapers() -> list:
    """List all available scrapers"""
    return ScraperFactory.get_available_scrapers()
