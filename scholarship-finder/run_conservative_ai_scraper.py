#!/usr/bin/env python3
"""
Run AI Discovery Scraper with very conservative settings to avoid 429 errors
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.scrapers.ai_discovery_scraper import AIDiscoveryScraper
from src.utils_python import ScrapingResult

# Load environment variables
load_dotenv('../.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_conservative_ai_scraper():
    """Run AI discovery scraper with very conservative settings"""
    
    # Check required environment variables
    openai_key = os.getenv('OPENAI_API_KEY')
    google_key = os.getenv('GOOGLE_API_KEY')
    google_cse = os.getenv('GOOGLE_CUSTOM_SEARCH_CX')
    
    if not all([openai_key, google_key, google_cse]):
        logger.error("❌ Missing required API keys")
        logger.error("   Required: OPENAI_API_KEY, GOOGLE_API_KEY, GOOGLE_CUSTOM_SEARCH_CX")
        logger.error("   Set these in your .env file")
        return
    
    logger.info("🚀 Starting AI Discovery Scraper with conservative settings...")
    logger.info("📊 Settings:")
    logger.info("   - Max sources per category: 3")
    logger.info("   - Max scholarships per source: 2")
    logger.info("   - Max Google API requests: 10")
    logger.info("   - Category delay: 30 seconds")
    logger.info("   - Crawl delay: 10 seconds")
    logger.info("   - Extraction delay: 5 seconds")
    
    # Create scraper with very conservative settings
    scraper = AIDiscoveryScraper(
        openai_api_key=openai_key,
        google_api_key=google_key,
        google_cse_id=google_cse,
        max_sources_per_category=3,      # Very low
        max_scholarships_per_source=2,   # Very low
        conservative_rate_limiting=True, # Conservative mode
        max_google_requests=10           # Very low limit
    )
    
    try:
        # Run with limited categories to avoid hitting quota
        limited_categories = ['energy', 'technology']  # Just 2 categories
        
        logger.info(f"🔍 Searching categories: {limited_categories}")
        
        result = scraper.scrape(categories=limited_categories)
        
        if result.success:
            logger.info("✅ Scraping completed successfully!")
            logger.info(f"📈 Results:")
            logger.info(f"   - Scholarships found: {len(result.scholarships)}")
            logger.info(f"   - Google API requests made: {scraper.google_requests_made}")
            logger.info(f"   - Processing time: {result.metadata.get('processing_time', 0):.2f} seconds")
            
            if result.errors:
                logger.warning(f"⚠️  Encountered {len(result.errors)} errors:")
                for error in result.errors:
                    logger.warning(f"   - {error}")
        else:
            logger.error("❌ Scraping failed!")
            for error in result.errors:
                logger.error(f"   - {error}")
                
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    run_conservative_ai_scraper()
