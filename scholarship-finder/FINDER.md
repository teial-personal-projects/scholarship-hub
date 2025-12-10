# Scholarship Finder - Usage Guide

This guide explains how to run the scholarship finder manually and set up automated scheduling.

## Prerequisites

1. **Python 3.13+** installed
2. **Virtual environment** set up:
   ```bash
   cd scholarship-finder
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Environment variables** configured in `.env.local`:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_key  # If using AI discovery
   GOOGLE_API_KEY=your_google_key  # If using Google Search
   GOOGLE_CUSTOM_SEARCH_CX=your_search_engine_id
   ```

## Running the Finder Manually

### Option 1: Using the Run Script (Recommended)

```bash
cd scholarship-finder
./scripts/run-finder.sh
```

You can also pass additional arguments:
```bash
./scripts/run-finder.sh --job-type scraper
./scripts/run-finder.sh --job-type ai_discovery
./scripts/run-finder.sh --job-type expiration_check
```

### Option 2: Activate Virtual Environment and Run Directly

```bash
cd scholarship-finder
source venv/bin/activate
python finder_main.py --mode scheduled
```

With specific job type:
```bash
python finder_main.py --mode scheduled --job-type scraper
python finder_main.py --mode scheduled --job-type ai_discovery
python finder_main.py --mode scheduled --job-type expiration_check
```

### Option 3: One-liner (No Activation Needed)

```bash
cd scholarship-finder && source venv/bin/activate && python finder_main.py --mode scheduled
```

## Available Job Types

- **`scraper`** - Run web scrapers to find scholarships
- **`ai_discovery`** - Use AI to discover scholarships from non-traditional sources
- **`expiration_check`** - Check and mark expired scholarships

If no job type is specified, the finder will run all available jobs.

## Setting Up Automated Scheduling (Cron Job)

The finder can be scheduled to run automatically using a cron job.

### Step 1: Make Scripts Executable

```bash
cd scholarship-finder
chmod +x scripts/run-finder.sh
chmod +x scripts/setup-cron.sh
```

### Step 2: Set Up the Cron Job

Run the setup script:
```bash
./scripts/setup-cron.sh
```

This will:
- Add a cron job that runs every 6 hours
- Set up logging to `logs/finder_YYYYMMDD.log`
- **NOT** execute the cron job immediately (you can test manually first)

### Step 3: Verify the Cron Job

View your crontab:
```bash
crontab -l
```

You should see an entry like:
```
0 */6 * * * /path/to/scholarship-finder/scripts/run-finder.sh >> /path/to/scholarship-finder/logs/finder_$(date +\%Y\%m\%d).log 2>&1
```

### Removing the Cron Job

If you need to remove the scheduled job:
```bash
crontab -l | grep -v 'run-finder.sh' | crontab -
```

## Logs

Logs are written to the `logs/` directory:
- Format: `finder_YYYYMMDD.log`
- Location: `scholarship-finder/logs/`

View recent logs:
```bash
cd scholarship-finder
ls -lt logs/ | head -5
tail -f logs/finder_$(date +%Y%m%d).log
```

## Troubleshooting

### "Virtual environment not found"

Set up the virtual environment:
```bash
cd scholarship-finder
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### "finder_main.py not found"

Make sure you're in the `scholarship-finder` directory and that `finder_main.py` exists.

### "Database connection error"

Check your `.env.local` file:
- `DATABASE_URL` should be a valid PostgreSQL connection string
- Format: `postgres://user:password@host:port/database`

You can find your Supabase connection string in:
Supabase Dashboard > Project Settings > Database > Connection string

### "Module not found" errors

Make sure all dependencies are installed:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Cron job not running

1. Check if cron is running:
   ```bash
   # macOS
   sudo launchctl list | grep cron
   
   # Linux
   sudo systemctl status cron
   ```

2. Check cron logs:
   ```bash
   # macOS - check system logs
   log show --predicate 'process == "cron"' --last 1h
   
   # Linux
   grep CRON /var/log/syslog
   ```

3. Verify the cron job path is absolute (the setup script handles this)

4. Test the script manually first:
   ```bash
   ./scripts/run-finder.sh
   ```

## Manual Testing

Before setting up the cron job, test the finder manually:

```bash
cd scholarship-finder
./scripts/run-finder.sh --job-type scraper
```

Check the output and logs to ensure everything works correctly.

## Next Steps

Once the finder is running:
1. Check the database for new scholarships
2. Monitor logs for any errors
3. Adjust the schedule if needed (edit crontab: `crontab -e`)
4. Set up monitoring/alerting if desired
