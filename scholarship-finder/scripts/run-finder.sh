#!/bin/bash
# Script to run the scholarship finder manually or via cron

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FINDER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to finder directory
cd "$FINDER_DIR"

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "❌ Error: Virtual environment not found at $FINDER_DIR/venv"
    echo "   Please set up the virtual environment first:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Check if finder_main.py exists
if [ ! -f "finder_main.py" ]; then
    echo "❌ Error: finder_main.py not found"
    exit 1
fi

# Run the finder
# You can pass additional arguments like --job-type scraper, --job-type ai_discovery, etc.
python finder_main.py --mode scheduled "$@"
