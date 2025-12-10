# Future Enhancements

This document outlines features and improvements that are planned but not yet implemented.

---

## Admin Interface

### Scraper Stats API

**Status**: Not implemented

**Description**: REST API endpoints to view scraper execution statistics and performance metrics.

**Proposed Endpoints**:
- `GET /api/admin/scraper/stats` - Get overall scraper statistics
- `POST /api/admin/scraper/trigger` - Manually trigger scraper run (admin only)

**Response Format**:
```typescript
{
  totalScholarships: number;
  lastScraperRun: Date;
  scholarshipsBySource: {
    source: string;
    count: number;
  }[];
  scholarshipsByCategory: {
    category: string;
    count: number;
  }[];
  recentlyAdded: Scholarship[];
  recentJobs: FinderJob[];
}
```

**Implementation Notes**:
- Query `finder_jobs` table for execution history
- Query `scholarships` table for counts
- Join with `scholarship_sources` and `scraper_categories` for names
- Add caching to avoid expensive queries on every request

**Related Tables**:
- `finder_jobs` - execution history and stats
- `scholarships` - scholarship counts
- `scholarship_sources` - source names
- `scraper_categories` - category names

---

### Category Management API

**Status**: Not implemented

**Description**: REST API endpoints for managing scholarship scraper categories through an admin interface.

**Proposed Endpoints**:
- `GET /api/admin/categories` - List all categories
- `GET /api/admin/categories/:id` - Get specific category
- `POST /api/admin/categories` - Create new category
- `PUT /api/admin/categories/:id` - Update category
- `PATCH /api/admin/categories/:id/toggle` - Enable/disable category
- `DELETE /api/admin/categories/:id` - Delete category

**Requirements**:
1. Create TypeScript controller files in `api/src/controllers/admin/`
2. Add routes to the API
3. Implement authentication/authorization for admin users
4. Add validation for category data

**Current Workaround**: Categories can be managed directly via SQL or Python scripts using `CategoryManager`.

---

### Admin Dashboard UI

**Status**: Not implemented

**Description**: Web-based admin interface for managing the scholarship finder system.

**Proposed Features**:
- **Category Management**
  - View all categories (enabled/disabled)
  - Add/edit/delete categories
  - Toggle category enabled status
  - Manage category keywords
  - View category performance stats

- **Scraper Monitoring**
  - View scraper job history
  - Monitor active scraper runs
  - View error logs
  - Performance metrics per source

- **Scholarship Management**
  - View all discovered scholarships
  - Manually verify/invalidate scholarships
  - Bulk operations
  - Search and filter

**Tech Stack**: React/Next.js (to match existing frontend)

**Implementation Priority**: Low (categories work fine via database)

---

## Scraper Enhancements

### Source Discovery Auto-Detection

**Status**: Not implemented

**Description**: Automatically discover new scholarship websites by analyzing top scholarship aggregator sites.

**Proposed Approach**:
1. Scrape major scholarship portals
2. Extract outbound links
3. Analyze linked sites for scholarship content
4. Score sites based on scholarship density
5. Auto-add high-scoring sites to `scholarship_sources`

---

### Machine Learning Classification

**Status**: Not implemented

**Description**: Use ML to improve scholarship categorization and field detection.

**Proposed Features**:
- Auto-classify scholarships into categories
- Extract field of study from descriptions
- Identify eligibility criteria automatically
- Predict scholarship relevance for users

---

## User Features

### Saved Search Alerts

**Status**: Not implemented

**Description**: Allow users to save search criteria and get notified of new matching scholarships.

**Database Changes**: New `saved_searches` table with user preferences

---

### Application Tracking Integration

**Status**: Not implemented

**Description**: Integrate discovered scholarships with the existing application tracking system.

**Proposed Flow**:
1. User discovers scholarship via finder
2. Click "Track Application" button
3. Auto-create application record
4. Pre-fill scholarship details
5. Track through existing application workflow

---

## Data Quality

### Scholarship Verification System

**Status**: Partially implemented (has `verified` field)

**Description**: System to verify scholarship legitimacy and data accuracy.

**Proposed Features**:
- Automated checks (valid URL, reasonable amounts, future deadlines)
- Manual review queue
- Community reporting
- Trust scores for sources
- Blacklist for known scam scholarships

---

### Duplicate Resolution UI

**Status**: Algorithm exists, no UI

**Description**: Interface to resolve fuzzy duplicates that the system flagged.

**Current State**: Deduplication engine works, but fuzzy matches might need manual review.

---

## Infrastructure

### Distributed Scraping

**Status**: Not implemented

**Description**: Run scrapers in parallel across multiple workers/containers.

**Benefits**:
- Faster scraping
- Better resource utilization
- Fault tolerance

**Implementation**: Docker Swarm or Kubernetes deployment

---

### Real-time Webhooks

**Status**: Not implemented

**Description**: Webhook notifications when new scholarships are discovered.

**Use Cases**:
- Notify users in real-time
- Trigger downstream systems
- Integration with Slack/Discord

---

## Analytics & Reporting

### Scraper Performance Dashboard

**Status**: Data collected, no dashboard

**Description**: Visualize scraper performance metrics.

**Metrics to Display**:
- Scholarships found per source
- Success/failure rates
- Response times
- Coverage by category
- Trends over time

---

### User Engagement Analytics

**Status**: Not implemented

**Description**: Track how users interact with discovered scholarships.

**Metrics**:
- Most viewed scholarships
- Application conversion rates
- Popular categories
- Search patterns

---

## Notes

- **Priority Levels**: High | Medium | Low
- **Implementation Order**: Focus on core scraping functionality first, then admin tools, then advanced features
- **Community Contribution**: Some of these features could be implemented by contributors

---

**Last Updated**: December 2025
