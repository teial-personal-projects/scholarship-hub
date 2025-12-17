# Scholarship Search Feature Removal Plan

## Executive Summary

This document outlines the plan to remove user-facing scholarship search and discovery features from the application while preserving the scholarship scraper infrastructure. The scraper will continue to populate the database, and we'll provide users with a curated list of external scholarship search websites instead.

## Rationale

Many scholarship search websites require authentication and explicitly prohibit bot scraping in their terms of service. Most websites don't want automated scraping. To maintain ethical practices and avoid potential legal issues, we're removing the automated search feature from the user-facing application.

## What We're Removing vs. Keeping

### ✅ KEEPING (Scraper Infrastructure)
- All Python scraper code in `/scholarship-finder/`
- Database tables: `scholarships`, `scholarship_sources`, `finder_jobs`
- Scraper documentation
- The ability to manually run scrapers for research/data collection purposes

### ❌ REMOVING (User-Facing Features)
- Scholarship search pages and UI
- User search preferences
- Scholarship recommendations based on user profile
- Ability to save/dismiss scholarships
- All user interaction with scraped scholarship data

## Removal Plan - Step by Step

### Phase 1: Database Schema Changes

**Priority: HIGH - Do this first to prevent data issues**

#### 1.1 Create New Migration ✅
- [x] **File:** `api/src/migrations/013_remove_search_features.sql`
- [x] **Actions:**
  - Drop `user_scholarships` table (tracks user saves/dismissals/views)
  - Drop `user_search_preferences` table (stores search criteria)
  - Add comment explaining why scholarships table remains (for scraper use)

#### 1.2 Update Mock Data ✅
- [x] **Remove:** `api/src/mocks/output/user_search_preferences.sql`
- [x] **Review:** `api/src/mocks/output/scholarships.sql` - Keep for scraper testing

---

### Phase 2: Shared Types Cleanup

**Priority: HIGH - Types are used across frontend and backend**

#### 2.1 Remove Type Files
- [ ] **Delete:** `shared/src/types/scholarship-search.types.ts`
- [ ] **Delete:** `shared/src/types/user-search-preferences.types.ts`

#### 2.2 Update Existing Type Files
- [ ] **File:** `shared/src/types/user.types.ts`
  - Remove `searchPreferences` field from `UserProfile` interface

- [ ] **File:** `shared/src/types/scholarship-finder.types.ts`
  - Remove: `UserScholarshipPreferences` interface
  - Remove: `UserScholarshipInteraction` interface
  - Remove: `MatchResult` interface
  - Keep: `ScholarshipResponse` (used by scrapers)
  - Review: `ScholarshipSearchParams` (may be removable)

---

### Phase 3: Backend/API Cleanup

**Priority: HIGH - Remove unused API endpoints**

#### 3.1 Remove Entire Service Files
- [ ] **Delete:** `api/src/services/scholarships.service.ts`
- [ ] **Delete:** `api/src/services/scholarship-matching.service.ts`

#### 3.2 Remove Entire Route Files
- [ ] **Delete:** `api/src/routes/scholarships.routes.ts`

#### 3.3 Update Users Service
- [ ] **File:** `api/src/services/users.service.ts`
  - Remove method: `getUserSearchPreferences()` (lines 109-121)
  - Remove method: `updateUserSearchPreferences()` (lines 126-211)
  - Update method: `getUserProfile()` (lines 18-32) - Remove search preferences from query

#### 3.4 Update Users Controller
- [ ] **File:** `api/src/controllers/users.controller.ts`
  - Remove method: `getMySearchPreferences()` (lines 105-124)
  - Remove method: `updateMySearchPreferences()` (lines 130-169)
  - Update method: `getMe()` (lines 22-39) - Don't return searchPreferences

#### 3.5 Update Users Routes
- [ ] **File:** `api/src/routes/users.routes.ts`
  - Remove routes (lines 20-24):
    - `GET /api/users/me/search-preferences`
    - `PATCH /api/users/me/search-preferences`

#### 3.6 Update Routes Index
- [ ] **File:** `api/src/routes/index.ts`
  - Remove import: `scholarshipsRoutes` (line 9)
  - Remove route registration: `router.use('/scholarships', scholarshipsRoutes)` (line 32)

---

### Phase 4: Frontend Cleanup

**Priority: HIGH - Remove user-facing pages**

#### 4.1 Remove Page Components
- [ ] **Delete:** `web/src/pages/Search.tsx`
- [ ] **Delete:** `web/src/pages/ScholarshipSearch.tsx`
- [ ] **Delete:** `web/src/pages/ScholarshipDetail.tsx`

#### 4.2 Update App Routes
- [ ] **File:** `web/src/App.tsx`
  - Remove routes (lines 86-108):
    - `/search` → Search component
    - `/scholarships/search` → ScholarshipSearch component
    - `/scholarships/:id` → ScholarshipDetail component

#### 4.3 Update Dashboard
- [ ] **File:** `web/src/pages/Dashboard.tsx`
  - Remove: `recommendedScholarships` state (line 37)
  - Remove: API call to `/scholarships/recommended` (lines 64-69)
  - Remove: "New Scholarships for You" widget (lines 196-258)
  - Remove: "Browse Scholarships" button (lines 174-190)

#### 4.4 Update Profile Page
- [ ] **File:** `web/src/pages/Profile.tsx`
  - Remove: Entire "Search Preferences" Accordion section (lines 321-517)
  - Remove: State variables for search preferences (lines 118-128, 147-208)

#### 4.5 Review Utility Files
- [ ] **File:** `web/src/utils/scholarship.ts`
  - If only used by removed features, delete it
  - If used elsewhere, keep it

---

### Phase 5: Create Scholarship Resources Page

**Priority: MEDIUM - Provide alternative value to users**

#### 5.1 Create New Page Component
- [ ] **Create:** `web/src/pages/ScholarshipResources.tsx`
  - Explanation of why we don't provide search
  - List of trusted scholarship search websites
  - Load scholarship sources from `scholarship_sources` table
  - Display as cards with:
    - Source name
    - Source URL
    - Description
    - Category/tags

#### 5.2 Add Route
- [ ] **File:** `web/src/App.tsx`
  - Add route: `/resources/scholarships` → ScholarshipResources component

#### 5.3 Add Navigation Link
- [ ] **File:** `web/src/components/Navigation.tsx`
  - Add "Scholarship Resources" link to navigation menu

#### 5.4 Create API Endpoint
- [ ] **File:** `api/src/routes/resources.routes.ts` (new file)
  - `GET /api/resources/scholarship-sites` - Fetch scholarship_sources with `is_active=true`

---

### Phase 6: Test Updates

**Priority: MEDIUM - Clean up test files**

#### 6.1 Frontend Tests
- [ ] **File:** `web/src/pages/Dashboard.test.tsx`
  - Remove tests related to scholarship recommendations
  - Remove API mocks for `/scholarships/recommended`

#### 6.2 Backend Tests
- [ ] **File:** `api/src/routes/users.test.ts`
  - Remove tests for search preferences endpoints

- [ ] **File:** `api/src/services/users.service.test.ts`
  - Remove tests for search preferences methods

#### 6.3 Test Fixtures
- [ ] **Review:** `web/src/test/fixtures/index.ts` - Remove scholarship data if present
- [ ] **Review:** `web/src/test/mocks/api.ts` - Remove scholarship endpoint mocks
- [ ] **Review:** `api/src/test/fixtures/users.fixture.ts` - Remove search preferences

---

### Phase 7: Documentation Updates

**Priority: LOW - Update after code changes**

#### 7.1 Remove Documentation
- [ ] **Delete:** `SCHOLARSHIP_SEARCH_IMPLEMENTATION.md`

#### 7.2 Update Documentation
- [ ] **File:** `SCHOLARSHIP_FINDER_IMPLEMENTATION.md`
  - Add note that this is for internal/research use only
  - Explain that scraped data is not exposed to end users

- [ ] **File:** `SCHOLARSHIP_INTEGRATION_SUMMARY.md`
  - Update to reflect removal of user-facing search
  - Keep scraper information

- [ ] **File:** `docs/database-schema.md`
  - Remove documentation for `user_search_preferences` table
  - Remove documentation for `user_scholarships` table
  - Keep documentation for `scholarships`, `scholarship_sources`, `finder_jobs`

- [ ] **File:** `IMPLEMENTATION_PLAN.md`
  - Remove or comment out search feature sections

- [ ] **File:** `FUTURE.md`
  - Add note about why search was removed
  - Potentially add ideas for ethical alternatives

#### 7.3 Create New Documentation
- [ ] **Create:** `WHY_NO_SEARCH.md`
  - Explain ethical considerations
  - Explain legal considerations (ToS violations, robots.txt)
  - Explain why scraper code remains (research, potential future uses)
  - Explain the resources page alternative

- [ ] **Update:** `README.md`
  - Remove references to scholarship search feature
  - Add link to scholarship resources page
  - Link to WHY_NO_SEARCH.md

---

## Implementation Order

### Sprint 1: Core Removal (Database & Backend)
1. ✅ Create database migration (Phase 1)
2. ✅ Remove shared types (Phase 2)
3. ✅ Remove backend services and routes (Phase 3)
4. ✅ Test backend changes

### Sprint 2: Frontend Cleanup
1. ✅ Remove frontend pages (Phase 4.1-4.2)
2. ✅ Update Dashboard and Profile (Phase 4.3-4.4)
3. ✅ Test frontend changes

### Sprint 3: Add Resources Page
1. ✅ Create ScholarshipResources page (Phase 5.1)
2. ✅ Add API endpoint (Phase 5.4)
3. ✅ Add routing and navigation (Phase 5.2-5.3)
4. ✅ Test resources page

### Sprint 4: Cleanup & Documentation
1. ✅ Update tests (Phase 6)
2. ✅ Update documentation (Phase 7)
3. ✅ Final review and testing

---

## Post-Removal Verification Checklist

- [ ] All scholarship search pages return 404
- [ ] Profile page has no search preferences section
- [ ] Dashboard has no scholarship recommendations
- [ ] API endpoints for scholarships return 404
- [ ] Database migrations run successfully
- [ ] No TypeScript compilation errors
- [ ] No broken imports
- [ ] All tests pass
- [ ] Resources page displays scholarship websites
- [ ] Documentation accurately reflects current state
- [ ] README updated with new features

---

## Rollback Plan

If issues arise during removal:

1. **Database:** Keep migration file but don't run it in production
2. **Code:** Use git to revert commits for each phase
3. **Types:** Restore from git history
4. **Frontend:** Feature flag to hide UI elements instead of removing them

---

## Future Considerations

### Potential Ethical Alternatives

1. **Manual Curation:** Admin panel to manually add verified scholarships
2. **User Submissions:** Allow students to submit scholarships they've found
3. **Partner Integration:** Official API partnerships with scholarship providers
4. **RSS Feeds:** Aggregate from sources that provide official feeds
5. **Research Only:** Keep scraper for research/statistical analysis only

### Keeping Scraper Code

The scraper code remains in the repository for several reasons:

1. **Research:** Historical data analysis and trends
2. **Future Opportunities:** Potential official partnerships
3. **Code Reuse:** Architecture may be useful for other features
4. **Documentation:** Shows technical capability
5. **Educational:** Demonstrates ethical web scraping practices

---

## Questions & Answers

**Q: Why keep the scholarship database tables?**
A: The scraper may still be used for research purposes, and the schema is valuable for potential future features.

**Q: What if users ask where the search feature went?**
A: Direct them to the new Scholarship Resources page and the WHY_NO_SEARCH.md document.

**Q: Can the scraper still be run?**
A: Yes, but only for internal/research purposes, not to populate user-facing features.

**Q: What about existing scraped data in the database?**
A: It remains for potential future use but is not exposed to users.

---

## Contact

For questions about this removal plan, contact the development team.

Last Updated: 2025-12-16
