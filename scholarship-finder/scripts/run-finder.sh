#!/bin/bash
# Script to run the scholarship finder manually or via cron

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FINDER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to finder directory
cd "$FINDER_DIR"

# Load environment variables from .env.local
if [ -f ".env.local" ]; then
    set -a
    source .env.local
    set +a
    echo "✅ Loaded environment variables from .env.local"
else
    echo "⚠️  Warning: .env.local not found. Using existing environment variables."
fi

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

# Create logs directory if it doesn't exist
mkdir -p logs

# Log start time
echo "🚀 Starting scholarship finder at $(date)"
echo "================================================"

# Run the finder
# You can pass additional arguments like --job-type scraper, --job-type ai_discovery, etc.
python finder_main.py --mode scheduled "$@"

# Capture exit code
EXIT_CODE=$?

# Log completion
echo "================================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Scholarship finder completed successfully at $(date)"
else
    echo "❌ Scholarship finder failed with exit code $EXIT_CODE at $(date)"
fi

exit $EXIT_CODE
