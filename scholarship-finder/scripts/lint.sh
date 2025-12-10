#!/bin/bash

# Linting script for scholarship scraper
# Checks for unused variables, functions, and other code quality issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the scraper directory (parent of scripts)
SCRAPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRAPER_DIR"

print_status "Running linter (ruff) on scraper code..."
print_status "Checking for unused variables, functions, and imports..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if ruff is installed
if ! command -v ruff &> /dev/null; then
    print_error "ruff is not installed. Installing..."
    pip install ruff==0.6.9
fi

# Run ruff check
print_status "Running ruff check..."
ruff check .

if [ $? -eq 0 ]; then
    print_status "✅ No linting issues found!"
else
    print_warning "⚠️  Some linting issues found. See above for details."
    print_status ""
    print_status "To auto-fix issues where possible, run:"
    print_status "  ruff check --fix ."
    exit 1
fi

