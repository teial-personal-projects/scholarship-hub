# Scholarship Discovery - Future Enhancement

**Status**: Deferred - To be implemented after MVP validates core tracking features

This document contains scholarship discovery features that were originally part of the main implementation plan. The MVP will focus on manual entry and tracking, with discovery features added based on user feedback.

---

## Overview

Scholarship discovery helps users find new scholarship opportunities within the app, rather than requiring them to search externally and manually enter details.

### Options for Future Implementation

There are several approaches to adding discovery features, each with different tradeoffs:

---

## Option 1: Curated Database

**Description**: Manually curate a database of popular, high-value scholarships that users can browse and apply to.

### Implementation Details

**Database Setup:**
- Populate `scholarships` table with 50-100 curated scholarships
- Focus on:
  - National scholarships (Gates, Coca-Cola, QuestBridge, etc.)
  - High-value awards ($5,000+)
  - Diverse eligibility criteria
  - Well-established organizations

**Backend:**
```typescript
// Endpoints needed:
GET /api/scholarships/browse - Browse curated scholarships
GET /api/scholarships/browse/:id - Get scholarship details
POST /api/scholarships/:id/apply - Create application from curated scholarship
```

**Data Maintenance:**
- Update deadlines annually (or mark as "rolling")
- Review and update eligibility criteria
- Add new scholarships based on user requests
- Remove defunct scholarships

### Pros & Cons

**Pros:**
- ✅ No API costs
- ✅ Structured, clean data
- ✅ Immediate value for users
- ✅ Good for demos and marketing
- ✅ Complete control over quality

**Cons:**
- ❌ Manual curation effort
- ❌ Data goes stale
- ❌ Limited coverage (can't include every scholarship)
- ❌ Ongoing maintenance required

### Estimated Effort
- Initial curation: 8-12 hours (research and data entry)
- Quarterly updates: 2-3 hours
- Annual refresh: 4-6 hours

---

## Option 2: Web Search Integration

**Description**: Integrate with Google Custom Search or Bing Search API to allow users to search the web for scholarships from within the app.

### Implementation Details

**API Setup:**

**Option A: Google Custom Search API**
```typescript
// Setup:
// 1. Create Custom Search Engine at https://cse.google.com
// 2. Get API key from Google Cloud Console
// 3. Get Search Engine ID

const searchScholarships = async (query: string) => {
  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?` +
    `key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${query} scholarship`
  );
  return await response.json();
};
```

**Option B: Bing Search API**
```typescript
const searchScholarships = async (query: string) => {
  const response = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${query} scholarship`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': BING_API_KEY
      }
    }
  );
  return await response.json();
};
```

**Backend:**
```typescript
// New endpoints:
POST /api/scholarships/web-search - Search external sources
POST /api/scholarships/import - Import search result as scholarship
```

**Frontend:**
```typescript
// New page: Web Search
// - Search input
// - Display web results with snippets
// - "Import" button to create scholarship from result
// - User fills in structured fields (deadline, amount, etc.)
```

### Pros & Cons

**Pros:**
- ✅ Leverages existing search engines
- ✅ Large coverage
- ✅ No manual curation needed
- ✅ Always up-to-date (as current as search engines)

**Cons:**
- ❌ API costs (see below)
- ❌ Results need parsing/cleaning
- ❌ Unstructured data (users still need to fill in details)
- ❌ Variable result quality
- ❌ May return irrelevant results

### Costs

**Google Custom Search API:**
- Free tier: 100 queries/day
- Paid: $5 per 1,000 queries
- Example: 100 users × 5 searches/day = 500 queries/day = ~$75/month

**Bing Search API:**
- Free tier: 1,000 transactions/month
- S1 tier: 1,000 transactions for $7
- Example: 500 searches/day × 30 days = 15,000/month = ~$105/month

### Estimated Effort
- Initial implementation: 1-2 days
- Testing and refinement: 1 day
- Ongoing: Minimal maintenance

---

## Option 3: Scraper Integration

**Description**: Implement the automated scholarship scraper as originally planned.

**See**: `SCRAPER_PHASE.md` for full implementation details.

**Summary:**
- Python scraper collects scholarships from various sources
- Populates `scholarship_raw_results` and `scholarships` tables
- Deduplication via fingerprinting
- Scheduled runs (daily/weekly)

**Best for:** Providing a comprehensive, always-fresh scholarship database without ongoing manual work.

---

## Option 4: Hybrid Approach

**Description**: Combine multiple approaches for maximum value.

### Phase 1: Curated Database
- Start with 50 high-value scholarships
- Provides immediate value
- Good for marketing and demos

### Phase 2: User Submissions
- Let users submit scholarships they find
- Community-driven growth
- Moderation queue to maintain quality

### Phase 3: Web Search or Scraper
- Add web search for one-off queries
- OR implement scraper for automated collection
- Choose based on user feedback

---

## Database Schema for Discovery

### Tables Needed

The following tables support discovery features and are already in the main implementation plan:

```sql
-- Already in Migration 006
CREATE TABLE public.user_seen_scholarships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scholarship_id BIGINT REFERENCES public.scholarships(id) ON DELETE CASCADE NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  interaction_type TEXT, -- 'viewed', 'applied', 'dismissed'
  UNIQUE(user_id, scholarship_id)
);

CREATE TABLE public.saved_search_criteria (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Additional Tables (If Implementing Curated/Scraper)

```sql
-- For tracking scholarship sources
ALTER TABLE public.scholarships ADD COLUMN source TEXT;
  -- Values: 'user_entered', 'curated', 'scraped', 'web_search'

-- For user-submitted scholarships (Option 4 - Hybrid)
CREATE TABLE public.scholarship_submissions (
  id BIGSERIAL PRIMARY KEY,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scholarship_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Phases

### MVP (Current Focus)
- **Manual Entry Only**: Users add scholarships themselves
- Focus on making tracking and collaboration features excellent

### Post-MVP Enhancement Options

**Quick Win (1-2 weeks):**
- Curated database of 50-100 scholarships
- Browse/search curated list
- "Apply" button creates application

**Medium Effort (2-3 weeks):**
- Web search integration (Google/Bing)
- Import search results
- Basic result parsing

**Long-term (4+ weeks):**
- Scraper implementation (see SCRAPER_PHASE.md)
- Automated collection and deduplication
- Scheduled runs

---

## Search & Filter Features

These features work regardless of whether scholarships are manually entered or auto-discovered.

### Backend Search Implementation

```typescript
interface SearchCriteria {
  keyword?: string;
  academicLevel?: string;
  major?: string;
  minGpa?: number;
  minAward?: number;
  maxAward?: number;
  gender?: string;
  deadlineAfter?: string;
  deadlineBefore?: string;
  excludeSeen?: boolean; // Hide scholarships user has already viewed
  source?: string[]; // Filter by source: 'user_entered', 'curated', etc.
}

// Search endpoint
POST /api/scholarships/search
```

### Full-Text Search

Use PostgreSQL's built-in full-text search:

```sql
-- Add tsvector column for full-text search
ALTER TABLE scholarships ADD COLUMN search_vector tsvector;

-- Create index
CREATE INDEX idx_scholarships_search ON scholarships USING GIN(search_vector);

-- Update trigger to maintain search_vector
CREATE FUNCTION scholarships_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.organization, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scholarships_search_update_trigger
  BEFORE INSERT OR UPDATE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION scholarships_search_update();

-- Search query
SELECT * FROM scholarships
WHERE search_vector @@ plainto_tsquery('english', 'computer science engineering');
```

### Filter Implementation

```typescript
// Backend service
export async function searchScholarships(
  userId: string,
  criteria: SearchCriteria
): Promise<Scholarship[]> {
  let query = supabase
    .from('scholarships')
    .select('*');

  if (criteria.keyword) {
    // Full-text search
    query = query.textSearch('search_vector', criteria.keyword);
  }

  if (criteria.academicLevel) {
    query = query.eq('academic_level', criteria.academicLevel);
  }

  if (criteria.minAward) {
    query = query.gte('min_award', criteria.minAward);
  }

  if (criteria.deadlineAfter) {
    query = query.gte('deadline', criteria.deadlineAfter);
  }

  if (criteria.excludeSeen) {
    // Exclude scholarships user has seen
    const { data: seenIds } = await supabase
      .from('user_seen_scholarships')
      .select('scholarship_id')
      .eq('user_id', userId);

    if (seenIds?.length) {
      query = query.not('id', 'in', seenIds.map(s => s.scholarship_id));
    }
  }

  const { data, error } = await query;
  return data || [];
}
```

---

## UI/UX Considerations

### Discovery Page (Future)

```
┌─ Discover Scholarships ──────────────────────────┐
│                                                   │
│ [Search box: "computer science"]                 │
│                                                   │
│ Filters:                                          │
│ Academic Level: [Undergraduate ▼]                │
│ Major: [Computer Science ▼]                      │
│ Min Award: [$____]  Max Award: [$____]           │
│ Deadline: [After: __/__] [Before: __/__]         │
│                                                   │
│ [Search] [Save Search]                            │
│                                                   │
│ ─────────────────────────────────────────────────│
│                                                   │
│ ┌─ Gates Millennium Scholarship ────────────────┐│
│ │ Bill & Melinda Gates Foundation               ││
│ │ Award: Full Tuition + Living Expenses         ││
│ │ Deadline: September 15, 2025                  ││
│ │                                                ││
│ │ High-achieving minority students with...      ││
│ │                                                ││
│ │ [View Details] [Apply] [Dismiss]              ││
│ └────────────────────────────────────────────────┘│
│                                                   │
│ ┌─ Coca-Cola Scholars Program ──────────────────┐│
│ │ Coca-Cola Scholars Foundation                 ││
│ │ Award: $20,000                                 ││
│ │ ...                                            ││
│                                                   │
└───────────────────────────────────────────────────┘
```

### Manual Entry (MVP)

```
┌─ Add Scholarship ─────────────────────────────────┐
│                                                    │
│ Found a scholarship? Add it here to start         │
│ tracking your application!                        │
│                                                    │
│ Scholarship Name: [______________________]        │
│ Organization:     [______________________]        │
│ Website URL:      [______________________]        │
│                                                    │
│ Award Amount:     $[________]                     │
│ Deadline:         [__/__/____]                    │
│                                                    │
│ [Add More Details Later] [Save & Start Applying]  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Recommendation

**For Post-MVP Enhancement:**

Start with **Option 1: Curated Database** because:
1. ✅ Low technical complexity
2. ✅ No ongoing API costs
3. ✅ Provides immediate value
4. ✅ Good for marketing ("Browse 100+ scholarships")
5. ✅ Can add other options later

**Timeline:**
- Week 1-2: Curate 50 scholarships
- Week 3: Add browse/search UI
- Week 4: User testing and refinement

Then evaluate:
- If users love it → Expand to 200+ scholarships
- If users want more variety → Add web search (Option 2)
- If you want to automate → Implement scraper (Option 3)

---

## Related Files

- Main implementation: `IMPLEMENTATION_PLAN.md`
- Scraper details: `SCRAPER_PHASE.md`
- Database schema: See Migration 006 in implementation plan
