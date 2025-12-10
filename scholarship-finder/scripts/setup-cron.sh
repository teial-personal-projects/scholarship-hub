#!/bin/bash
# Script to set up cron job for scholarship finder
# This script will add a cron job entry but will NOT execute it automatically
# Run this script when you're ready to enable scheduled runs

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FINDER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$FINDER_DIR/.." && pwd)"

# Path to the run script
RUN_SCRIPT="$FINDER_DIR/scripts/run-finder.sh"

# Make sure the run script exists
if [ ! -f "$RUN_SCRIPT" ]; then
    echo "❌ Error: run-finder.sh not found at $RUN_SCRIPT"
    echo "   Please create the run script first."
    exit 1
fi

# Make sure the run script is executable
chmod +x "$RUN_SCRIPT"

# Create logs directory if it doesn't exist
mkdir -p "$FINDER_DIR/logs"

echo "📋 Setting up cron job for scholarship finder..."
echo ""
echo "This will add a cron job that runs every 6 hours."
echo "The cron job will run: $RUN_SCRIPT"
echo ""

# Create a temporary file with the new cron job
CRON_JOB="0 */6 * * * $RUN_SCRIPT >> $FINDER_DIR/logs/finder_\$(date +\\%Y\\%m\\%d).log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$RUN_SCRIPT"; then
    echo "⚠️  A cron job for this script already exists."
    echo ""
    echo "Current crontab:"
    crontab -l | grep "$RUN_SCRIPT"
    echo ""
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled. No changes made."
        exit 0
    fi
    # Remove existing entry
    crontab -l 2>/dev/null | grep -v "$RUN_SCRIPT" | crontab -
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "The scholarship finder will now run every 6 hours."
echo ""
echo "To view your crontab:"
echo "  crontab -l"
echo ""
echo "To remove this cron job:"
echo "  crontab -l | grep -v '$RUN_SCRIPT' | crontab -"
echo ""
echo "Logs will be written to: $FINDER_DIR/logs/"
echo ""
