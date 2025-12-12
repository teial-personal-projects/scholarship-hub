#!/usr/bin/env python3
"""
Main entry point for the scholarship finder scraper
Adapted for PostgreSQL/Supabase database
"""

import os
import sys
import argparse
import logging
from typing import Optional
from dotenv import load_dotenv, find_dotenv

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.scraper_factory import ScraperOrchestrator, list_available_scrapers, run_scraper
from src.utils_python import ScrapingResult

# Load environment variables
# Try to find .env.local first (local overrides), then fall back to .env
dotenv_local_path = find_dotenv('.env.local', usecwd=True)
dotenv_path = find_dotenv('.env', usecwd=True)

if dotenv_local_path:
    load_dotenv(dotenv_local_path)
    print(f"✅ Loaded environment from: {dotenv_local_path}")
elif dotenv_path:
    load_dotenv(dotenv_path)
    print(f"✅ Loaded environment from: {dotenv_path}")
else:
    # Fallback to looking in parent directory
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    dotenv_local_path = os.path.join(repo_root, '.env.local')
    dotenv_path = os.path.join(repo_root, '.env')

    if os.path.exists(dotenv_local_path):
        load_dotenv(dotenv_local_path)
        print(f"✅ Loaded environment from: {dotenv_local_path}")
    elif os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
        print(f"✅ Loaded environment from: {dotenv_path}")
    else:
        print("⚠️  Warning: No .env or .env.local file found")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def setup_local_environment():
    """Set up local development environment and verify PostgreSQL connection"""
    logger.info("Setting up local development environment")

    # Check if PostgreSQL/Supabase is available
    try:
        import psycopg2
        from urllib.parse import urlparse

        # Get database URL from environment
        database_url = os.getenv('DATABASE_URL')

        if not database_url:
            logger.error("❌ DATABASE_URL not found in environment variables")
            logger.info("   Please set DATABASE_URL in your .env.local file")
            logger.info("   Example: DATABASE_URL=postgresql://user:password@host:5432/database")
            return False

        # Parse and mask password for logging
        parsed = urlparse(database_url)
        masked_url = database_url.replace(parsed.password or '', '****') if parsed.password else database_url
        logger.info(f"Testing database connection to: {masked_url}")

        try:
            # Test connection
            conn = psycopg2.connect(database_url)
            conn.close()
            logger.info("✅ PostgreSQL connection successful")
            return True
        except Exception as db_error:
            logger.error(f"❌ PostgreSQL connection failed: {db_error}")
            logger.info("   Check your DATABASE_URL in .env.local")
            logger.info("   Make sure your Supabase database is accessible")
            return False

    except ImportError:
        logger.error("❌ psycopg2 not installed. Run: pip install psycopg2-binary")
        return False


def run_single_scraper(scraper_name: str, environment: str = "local") -> ScrapingResult:
    """Run a single scraper"""
    logger.info(f"🚀 Running scraper: {scraper_name}")

    result = run_scraper(
        scraper_name=scraper_name,
        environment=environment,
        job_id=f"local_{scraper_name}_{os.getpid()}"
    )

    if result.success:
        logger.info(f"✅ Scraper {scraper_name} completed successfully")
        logger.info(f"   Found: {len(result.scholarships)} scholarships")
        logger.info(f"   Inserted: {result.metadata.get('total_inserted', 0)}")
        logger.info(f"   Updated: {result.metadata.get('total_updated', 0)}")

        if result.errors:
            logger.warning(f"⚠️  Encountered {len(result.errors)} errors")
            for error in result.errors:
                logger.warning(f"     - {error}")
    else:
        logger.error(f"❌ Scraper '{scraper_name}' failed")
        if "Could not create scraper" in str(result.errors):
            logger.error("   💡 Try: python main.py --list")
            logger.error("   💡 Available scrapers:")
            logger.error("      - 'careeronestop' (CareerOneStop)")
            logger.error("      - 'collegescholarship' (CollegeScholarship)")
            logger.error("      - 'ai_discovery' (AI Discovery)")

        for error in result.errors:
            logger.error(f"     Error: {error}")

    return result


def run_all_scrapers(environment: str = "local"):
    """Run all available scrapers"""
    logger.info("🚀 Running all available scrapers")

    orchestrator = ScraperOrchestrator(environment=environment)
    results = orchestrator.run_all_scrapers(
        job_id=f"local_all_{os.getpid()}"
    )

    total_scholarships = 0
    total_inserted = 0
    total_updated = 0
    total_errors = 0

    logger.info("\n" + "="*60)
    for scraper_name, result in results.items():
        logger.info(f"\n📊 {scraper_name.upper()} RESULTS:")
        if result.success:
            scholarships_found = len(result.scholarships)
            inserted = result.metadata.get('total_inserted', 0)
            updated = result.metadata.get('total_updated', 0)

            logger.info(f"   ✅ Success: {scholarships_found} scholarships found")
            logger.info(f"   📝 Inserted: {inserted}")
            logger.info(f"   🔄 Updated: {updated}")

            total_scholarships += scholarships_found
            total_inserted += inserted
            total_updated += updated
        else:
            error_count = len(result.errors)
            logger.error(f"   ❌ Failed: {error_count} errors")
            total_errors += error_count
            for error in result.errors[:3]:  # Show first 3 errors
                logger.error(f"      - {error}")

    logger.info("\n" + "="*60)
    logger.info("📈 OVERALL SUMMARY")
    logger.info(f"   Total scholarships found: {total_scholarships}")
    logger.info(f"   Total inserted: {total_inserted}")
    logger.info(f"   Total updated: {total_updated}")
    logger.info(f"   Total errors: {total_errors}")
    logger.info("="*60 + "\n")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Scholarship Finder - Scrape scholarships and save to database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run a specific scraper
  python main.py --scraper careeronestop --environment local
  python main.py --scraper collegescholarship --environment local
  python main.py --scraper ai_discovery --environment local

  # List available scrapers
  python main.py --list

  # Run all scrapers
  python main.py --all --environment local

  # Set up and test database connection
  python main.py --setup

  # Run linter
  python main.py --lint
  python main.py --lint-fix

Notes:
  - Requires DATABASE_URL in .env.local file
  - Uses PostgreSQL/Supabase database
  - API keys needed for ai_discovery scraper (OPENAI_API_KEY, GOOGLE_API_KEY, GOOGLE_CUSTOM_SEARCH_CX)
        """
    )

    parser.add_argument('--scraper', '-s',
                       help='Name of the scraper to run (e.g., careeronestop, collegescholarship, ai_discovery)')
    parser.add_argument('--all', '-a',
                       action='store_true',
                       help='Run all available scrapers')
    parser.add_argument('--list', '-l',
                       action='store_true',
                       help='List all available scrapers')
    parser.add_argument('--environment', '-e',
                       default='local',
                       choices=['local', 'dev', 'staging', 'prod'],
                       help='Environment to run in (default: local)')
    parser.add_argument('--setup',
                       action='store_true',
                       help='Set up local development environment and test database connection')
    parser.add_argument('--lint',
                       action='store_true',
                       help='Run linter (ruff) to check for code quality issues')
    parser.add_argument('--lint-fix',
                       action='store_true',
                       help='Run linter and automatically fix issues where possible')

    args = parser.parse_args()

    # Set up local environment if requested
    if args.setup:
        success = setup_local_environment()
        sys.exit(0 if success else 1)

    # Run linter if requested
    if args.lint or args.lint_fix:
        import subprocess
        logger.info("🔍 Running linter (ruff)...")
        try:
            cmd = ['ruff', 'check']
            if args.lint_fix:
                cmd.append('--fix')
            cmd.append('.')
            result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
            if result.returncode == 0:
                logger.info("✅ No linting issues found!")
            else:
                logger.warning("⚠️  Some linting issues found. See above for details.")
                if not args.lint_fix:
                    logger.info("💡 Run with --lint-fix to automatically fix issues where possible")
            sys.exit(result.returncode)
        except FileNotFoundError:
            logger.error("❌ ruff is not installed. Install it with: pip install ruff")
            logger.info("   Or run the lint script: ./scripts/lint.sh")
            sys.exit(1)
        except Exception as e:
            logger.error(f"❌ Error running linter: {e}")
            sys.exit(1)

    # List available scrapers
    if args.list:
        scrapers = list_available_scrapers()
        print("\n📋 Available scrapers:")
        for scraper in scrapers:
            print(f"   - {scraper}")
        print("")
        return

    # Run all scrapers
    if args.all:
        run_all_scrapers(args.environment)
        return

    # Run single scraper
    if args.scraper:
        run_single_scraper(args.scraper, args.environment)
        return

    # Default: show help
    parser.print_help()


if __name__ == "__main__":
    main()
