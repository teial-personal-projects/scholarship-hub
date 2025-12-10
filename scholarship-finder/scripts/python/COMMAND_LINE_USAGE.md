# Command Line Usage Guide

## Quick Start

### **Option 1: Use the Shell Script (Easiest)**
```bash
# From repo root, navigate to the script directory
cd scraper/scripts/python

# Run any scraper
./run_scraper.sh --scraper careerone --environment local

# List available scrapers
./run_scraper.sh --list

# Run all scrapers
./run_scraper.sh --all --environment local

# Get help
./run_scraper.sh --help
```

### **Option 2: Activate Virtual Environment Manually (run Python directly)**
```bash
# From repo root, navigate to the scraper directory
cd scraper

# Activate virtual environment
source venv/bin/activate

# Run scrapers
python main.py --scraper careeronestop --environment local
python main.py --scraper general --environment local

# Deactivate when done
deactivate
```

### **Option 3: One-liner (No Virtual Environment Activation)**
```bash
# Run directly with virtual environment from the scraper directory
cd scraper && source venv/bin/activate && python main.py --scraper careeronestop --environment local
```

## Available Scrapers

| Scraper Name | Description | Alias |
|--------------|-------------|-------|
| `careeronestop` | CareerOneStop.org scraper | `careerone` |
| `general` | General web scraper | - |


## Common Commands

```bash
# Navigate to scripts/python directory first
cd scraper/scripts/python

# Quick test with general scraper
./run_scraper.sh --scraper general --environment local

# Test CareerOneStop
./run_scraper.sh --scraper careerone --environment local

# List all available scrapers
./run_scraper.sh --list

# Run all scrapers
./run_scraper.sh --all --environment local

# Get help
./run_scraper.sh --help
```

## Environment Options

- `--environment local` (default) - Uses local MySQL database
- `--environment prod` - Uses AWS RDS MySQL database
- `--environment dev` - Uses development environment
- `--environment staging` - Uses staging environment

## Troubleshooting

### **"ModuleNotFoundError: No module named 'dotenv'"**
This means you're not using the virtual environment. Use one of these solutions:

1. **Use the shell script:**
   ```bash
   cd scraper/scripts/python
   ./run_scraper.sh --scraper careerone --environment local
   ```

2. **Activate virtual environment first:**
   ```bash
   cd scraper
   source venv/bin/activate
   python main.py --scraper careeronestop --environment local
   ```

3. **Install packages globally (not recommended):**
   ```bash
   pip3 install python-dotenv requests beautifulsoup4 pymysql boto3 tenacity
   ```

### **"Unknown scraper" Error**
Use the `--list` command to see available scrapers:
```bash
cd scraper/scripts/python
./run_scraper.sh --list
```

### **Database Connection Errors**
Make sure MySQL is running:
```bash
# On macOS with Homebrew
brew services start mysql

# Check if MySQL is running
mysql -u root -e "SELECT 1;"
```

## Examples

```bash
# Navigate to scripts/python directory first
cd scraper/scripts/python

# Test all scrapers locally
./run_scraper.sh --all --environment local

# Test specific scraper in production
./run_scraper.sh --scraper careerone --environment prod

# Get help
./run_scraper.sh --help

# List scrapers
./run_scraper.sh --list
```
