# Scholarship Search Integration - Quick Start Guide

This document provides a high-level overview of integrating scholarship search into your scholarship-hub app.

## 📁 Documentation

- **SCHOLARSHIP_FINDER_IMPLEMENTATION.md** - Backend data pipeline (Python)
- **SCHOLARSHIP_SEARCH_IMPLEMENTATION.md** - User-facing search features (Node.js/React)

## 🎯 Overview

### Two Main Components

1. **Scholarship Finder** (Python Service)
   - Discovers scholarships from multiple sources
   - Runs on a schedule (every 6 hours)
   - Uses AI to find non-traditional sources
   - Prevents duplicates with checksums
   - Marks expired scholarships

2. **Scholarship Search** (Node.js API + React Frontend)
   - Users search scholarships
   - Personalized recommendations
   - Save scholarships
   - Track viewed scholarships
   - Convert to applications

## 🏗️ Architecture

```
┌─────────────────────────┐
│  Python Service         │
│  (Scholarship Finder)   │
│  - Scrapes websites     │
│  - AI discovery         │
│  - Deduplication        │
└───────────┬─────────────┘
            │ Writes to DB
            ▼
    ┌───────────────┐
    │   PostgreSQL  │
    │   (Shared)    │
    └───────┬───────┘
            │ Reads from DB
            ▼
┌─────────────────────────┐
│  Node.js API            │
│  - Search endpoint      │
│  - Recommendations      │
│  - User interactions    │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │  React Web    │
    │  - Search UI  │
    │  - Detail     │
    │  - Dashboard  │
    └───────────────┘
```

## 📊 Database Tables

### New Tables to Add

1. **scholarships** - Main scholarship data
2. **scholarship_sources** - Websites to scrape
3. **finder_jobs** - Job execution tracking
4. **user_scholarships** - User interactions (viewed, saved, dismissed)

## 🚀 Implementation Order

### Phase 1: Database Setup (Day 1)
- Create database migrations
- Add new tables
- Test migrations

### Phase 2: Scholarship Finder (Days 2-5)
- Move Python scraper to `scholarship-finder/` directory
- Update database connections to use PostgreSQL
- Implement deduplication engine
- Test AI discovery with one category
- Set up basic scheduler (cron)

### Phase 3: Backend API (Days 6-8)
- Create scholarship service
- Add search endpoints
- Implement recommendations
- Add save/dismiss functionality
- Write tests

### Phase 4: Frontend UI (Days 9-12)
- Create search page
- Create detail page
- Add dashboard widget
- Implement preferences form
- Write tests

### Phase 5: Integration & Testing (Days 13-14)
- End-to-end testing
- Performance optimization
- Deploy and monitor

## 💰 Cost Estimate

### Development
- ~2-3 weeks full-time
- Can be done incrementally

### Monthly Operating Costs
- **Hosting**: $0-10 (run locally or cheap VPS)
- **Database**: $0 (Supabase free tier)
- **OpenAI API**: $10-20 (GPT-3.5-turbo is cheap)
- **Google Custom Search**: $0-5 (100 free queries/day)
- **Total**: ~$15-30/month

### Scaling
- Start small: 2-3 categories, every 6 hours
- Scale up: More categories, more frequent
- Production: ~$30-50/month with full coverage

## 🔑 Key Decisions Made

### 1. Tech Stack
**Decision**: Keep Python for scraping, Node.js for API
**Why**:
- Python better for scraping/AI
- Already have working Python scraper
- Node.js better for API/web
- Share same database = simple integration

### 2. Database
**Decision**: Use existing PostgreSQL (Supabase)
**Why**:
- No new infrastructure
- Consistent with rest of app
- Free tier sufficient to start

### 3. Scheduling
**Decision**: Start with cron, optionally move to Node.js scheduler
**Why**:
- Cron is free and simple
- Can integrate with Node later if needed
- Flexible deployment

### 4. AI Usage
**Decision**: Use OpenAI for discovery, not for every search
**Why**:
- Discovery runs monthly (~$10-20)
- Search is instant and free (database queries)
- Best of both worlds

## 🛠️ Getting Started

### Step 1: Review Documentation
```bash
# Read the implementation plans
cat SCHOLARSHIP_FINDER_IMPLEMENTATION.md
cat SCHOLARSHIP_SEARCH_IMPLEMENTATION.md
```

### Step 2: Database Setup
```bash
cd scholarship-hub/api
npm run migration:create add_scholarships_tables
# Edit migration file with schema from docs
npm run migrate:latest
```

### Step 3: Set Up Scholarship Finder
```bash
cd scholarship-hub
mkdir scholarship-finder

# Copy your existing scraper
cp -r /path/to/scholarship-tracker/scraper/* scholarship-finder/

# Install dependencies
cd scholarship-finder
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 4: Configure Environment
```bash
# Add to .env in project root
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GOOGLE_CUSTOM_SEARCH_CX=your_cx_here
```

### Step 5: Test Scholarship Finder
```bash
cd scholarship-finder
python finder_main.py --scraper general
```

### Step 6: Implement Backend API
```bash
cd scholarship-hub/api
# Create services, routes, and types as documented
```

### Step 7: Implement Frontend
```bash
cd scholarship-hub/web
# Create search page, detail page, dashboard widgets
```

## 📝 Checklist

### Scholarship Finder
- [ ] Database migrations created and run
- [ ] Python finder moved to project
- [ ] Database connection updated for PostgreSQL
- [ ] Deduplication engine implemented
- [ ] AI discovery tested
- [ ] Expiration manager implemented
- [ ] Scheduler configured (cron or Node.js)

### Backend API
- [ ] Scholarship service created
- [ ] Search endpoint implemented
- [ ] Recommendations endpoint implemented
- [ ] Save/dismiss endpoints implemented
- [ ] User preferences endpoint implemented
- [ ] Tests written

### Frontend
- [ ] Search page created
- [ ] Detail page created
- [ ] Dashboard widget added
- [ ] Preferences form created
- [ ] Saved scholarships page created
- [ ] Tests written

## 🎓 Best Practices

### Deduplication
- Always generate checksum before inserting
- Check URL uniqueness
- Use fuzzy matching for similar names
- Merge data when updating existing scholarships

### AI Usage
- Use GPT-3.5-turbo for queries (cheap)
- Use GPT-4-turbo for extraction (accurate)
- Limit API calls with rate limiting
- Cache results when possible

### Performance
- Index heavily queried fields (category, deadline, status)
- Use pagination for search results
- Implement caching for recommendations
- Optimize database queries

### User Experience
- Never show same scholarship twice
- Explain why scholarships are recommended
- Make search filters intuitive
- Provide clear call-to-actions

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check environment variables
echo $SUPABASE_HOST
echo $SUPABASE_PASSWORD

# Test connection
psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DATABASE
```

### Python Dependencies
```bash
# Reinstall dependencies
cd scholarship-finder
pip install -r requirements.txt --force-reinstall
```

### API Key Issues
```bash
# Verify OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Verify Google Custom Search
curl "https://www.googleapis.com/customsearch/v1?key=$GOOGLE_API_KEY&cx=$GOOGLE_CUSTOM_SEARCH_CX&q=test"
```

## 📚 Next Steps

1. Start with **SCHOLARSHIP_FINDER_IMPLEMENTATION.md**
   - Set up database
   - Get Python finder working
   - Run first discovery job

2. Move to **SCHOLARSHIP_SEARCH_IMPLEMENTATION.md**
   - Implement backend API
   - Build frontend UI
   - Test end-to-end

3. Launch & Monitor
   - Start with small scale (2-3 categories)
   - Monitor costs and performance
   - Scale up gradually

## 🆘 Getting Help

If you get stuck:
1. Check the detailed implementation plans
2. Review your existing scraper code
3. Test components individually
4. Start small and iterate

Good luck! 🚀
