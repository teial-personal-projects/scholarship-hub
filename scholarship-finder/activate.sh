#!/bin/bash
# Script to activate virtual environment and run the scraper

echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo "🐍 Python version: $(python --version)"
echo "📦 Installed packages: $(pip list | wc -l) packages"

echo ""
echo "🚀 Available commands:"
echo "  python main.py --list                    # List available scrapers"
echo "  python main.py --scraper careerone       # Run CareerOneStop scraper"
echo "  python main.py --scraper collegescholarship  # Run CollegeScholarship scraper"
echo "  python main.py --scraper general         # Run general scraper"

echo ""
echo "💡 To deactivate the virtual environment, run: deactivate"
echo ""
