# Scholarship Scraper Integration - Future Phase

**Status**: Deferred - To be implemented after core functionality is solidly working

This document contains all scraper-related implementation details that were originally part of the main implementation plan. The scraper integration will be revisited once the core scholarship application tracking features are stable.

---

## Overview

The scholarship scraper is a Python-based tool that automatically discovers and collects scholarship opportunities from various sources. It will integrate with the ScholarshipHub backend to populate the database with fresh scholarship data.

### Existing Scraper

- **Location**: `/Users/teial/Tutorials/scholarship-tracker/scraper/`
- **Language**: Python
- **Features**: AI discovery scraper logic, existing configurations
- **Status**: Working in old project, needs migration to new stack

---

## Project Structure (Scraper Components)

```
scholarship-hub/
├── scraper/                     # Python scholarship scraper
│   ├── requirements.txt
│   ├── README.md
│   ├── main.py
│   ├── scrapers/
│   │   ├── ai_discovery.py
│   │   └── base_scraper.py
│   ├── storage/
│   └── tests/
```

---

## Database Schema for Scraper

### Migration: Scraper Results Table

This table should be created as part of the Search & Discovery migration, or in its own migration:

```sql
-- Raw scraper results
CREATE TABLE public.scholarship_raw_results (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL, -- 'Fastweb', 'CollegeBoard', etc.
  source_url TEXT,
  raw_payload JSONB NOT NULL,
  fingerprint TEXT UNIQUE NOT NULL, -- for dedupe
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  matched_scholarship_id BIGINT REFERENCES public.scholarships(id) ON DELETE SET NULL
);

CREATE INDEX idx_raw_results_fingerprint ON public.scholarship_raw_results(fingerprint);
CREATE INDEX idx_raw_results_source ON public.scholarship_raw_results(source);

-- Enable Row Level Security
ALTER TABLE public.scholarship_raw_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view raw scraper results
CREATE POLICY "Admin only access to raw results" ON public.scholarship_raw_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

**Purpose**:
- Store raw data from scrapers before processing
- Enable deduplication via fingerprint
- Track which source each scholarship came from
- Link raw results to processed scholarships

---

## Phase 8: Scraper Integration & Enhancement

**Goal**: Enhance existing Python scraper, integrate with new backend

### TODO 8.1: Review Existing Scraper

- [ ] Copy scraper from existing project to new location:
  ```bash
  mkdir -p scraper/{scrapers,storage,tests}
  cp -r /Users/teial/Tutorials/scholarship-tracker/scraper/* scraper/
  ```
- [ ] Review files copied:
  - AI discovery scraper logic
  - Existing scraper configurations
  - Requirements and dependencies
- [ ] Document current scraper capabilities in `scraper/README.md`
- [ ] Review what needs to be updated for Supabase PostgreSQL

### TODO 8.2: Update Scraper to Use PostgreSQL

- [ ] Install PostgreSQL driver: `pip install psycopg2-binary` or `asyncpg`
- [ ] Update database connection to use Supabase PostgreSQL connection string
- [ ] Update table names to match new schema
- [ ] Create `scraper/.env` file with Supabase credentials:
  ```
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_KEY=xxx
  DATABASE_URL=postgresql://user:pass@host:5432/db
  ```

### TODO 8.3: Implement Deduplication Logic

- [ ] Create fingerprint function:
  ```python
  import hashlib

  def create_fingerprint(scholarship: dict) -> str:
      """
      Create unique fingerprint for scholarship to detect duplicates.
      Uses: title + organization + deadline + award amount
      """
      # Normalize strings (lowercase, strip whitespace)
      title = scholarship.get('title', '').lower().strip()
      org = scholarship.get('organization', '').lower().strip()
      deadline = scholarship.get('deadline', '').strip()
      award = str(scholarship.get('min_award', 0))

      key = f"{title}|{org}|{deadline}|{award}"
      return hashlib.sha256(key.encode()).hexdigest()
  ```
- [ ] Before inserting to `scholarships`:
  - Insert to `scholarship_raw_results` with fingerprint
  - Check if fingerprint exists → skip if duplicate
  - Otherwise, upsert to `scholarships` table
- [ ] Handle updates: if fingerprint matches but data changed, update existing record

### TODO 8.4: Enhance Scraper Categories

- [ ] Review current categories (STEM, Healthcare, etc.)
- [ ] Add more categories or customize based on user feedback
- [ ] Make categories configurable via config file
- [ ] Add subject area mapping to match `subject_areas` table

### TODO 8.5: Schedule Scraper Runs

- [ ] Set up cron job or GitHub Actions workflow to run scraper:
  - Daily or weekly
  - Run all categories
  - Log results to file or monitoring service
- [ ] Monitor for errors and send alerts
- [ ] Example cron job:
  ```bash
  # Run daily at 2 AM
  0 2 * * * cd /path/to/scraper && python main.py >> logs/scraper.log 2>&1
  ```
- [ ] Example GitHub Action:
  ```yaml
  name: Run Scholarship Scraper
  on:
    schedule:
      - cron: '0 2 * * *'  # Daily at 2 AM UTC
    workflow_dispatch:  # Manual trigger

  jobs:
    scrape:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Set up Python
          uses: actions/setup-python@v4
          with:
            python-version: '3.11'
        - name: Install dependencies
          run: |
            cd scraper
            pip install -r requirements.txt
        - name: Run scraper
          env:
            SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
            SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          run: |
            cd scraper
            python main.py
  ```

### TODO 8.6: Backend - Scraper Stats API

- [ ] Create endpoint: `GET /api/admin/scraper/stats`
- [ ] Return statistics:
  ```typescript
  {
    totalScholarships: number;
    lastScraperRun: Date;
    scholarshipsBySource: {
      source: string;
      count: number;
    }[];
    recentlyAdded: Scholarship[];
  }
  ```
- [ ] (Optional) Create admin dashboard to trigger scraper manually
- [ ] Create endpoint: `POST /api/admin/scraper/trigger` (admin only)

**Milestone**: Scraper fully integrated, runs automatically, no duplicates

---

## Integration Points

### 1. Scraper → Database

The scraper writes directly to PostgreSQL:
1. Insert raw data into `scholarship_raw_results`
2. Check for duplicates via fingerprint
3. Insert/update `scholarships` table
4. Link subject areas via `scholarship_subject_areas`
5. Link geographic restrictions via `scholarship_geographic_restrictions`

### 2. Backend → Scraper Data

Backend API reads from `scholarships` table:
- Search endpoint uses fingerprint-deduplicated data
- Users see only processed, cleaned scholarships
- Admin endpoints can access raw scraper results for debugging

### 3. User → Scraped Data

Users interact with scraped data through:
- Search & discovery features
- Browse scholarships page
- Saved searches (notify when new scholarships match)

---

## Testing Strategy

### Unit Tests
- Test fingerprint generation with various inputs
- Test deduplication logic
- Test data transformation (raw → processed)

### Integration Tests
- Test database connection
- Test full scrape → store workflow
- Test error handling (network errors, malformed data)

### Manual Testing
- Run scraper on small dataset
- Verify no duplicates created
- Verify data quality in database
- Test scheduled runs

---

## Monitoring & Maintenance

### Metrics to Track
- Number of scholarships scraped per run
- Number of duplicates detected
- Errors encountered
- Time per source
- Database growth rate

### Alerts
- Scraper failed to run
- High error rate (>10%)
- No new scholarships found (potential issue)
- Database connection failures

### Maintenance Tasks
- Review and update scraper selectors (websites change)
- Add new sources
- Clean up old raw results (retention policy)
- Optimize performance

---

## Future Enhancements

### Phase 1 (Basic)
- Copy existing scraper
- Update for PostgreSQL
- Implement deduplication
- Schedule basic runs

### Phase 2 (Enhanced)
- Add more sources
- Improve data quality (ML-based cleaning)
- Better categorization
- Add scholarship verification

### Phase 3 (Advanced)
- User-requested sources
- Real-time scraping triggers
- Scholarship change detection
- Quality scoring algorithm
- Community-contributed sources

---

## References

- Existing scraper location: `/Users/teial/Tutorials/scholarship-tracker/scraper/`
- Database schema: See main `IMPLEMENTATION_PLAN.md`
- API design: See `docs/api-spec.md` (to be created)

---

## Notes

- The scraper should be kept as a separate concern from core application features
- It can run independently via cron/GitHub Actions
- The application should work without the scraper (manual scholarship entry)
- Consider scraper as a "nice to have" feature enhancement, not core functionality
