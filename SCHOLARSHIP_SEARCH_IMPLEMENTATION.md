## Scholarship Search Implementation Plan

**Goal**: Build a user-facing scholarship search and recommendation system that helps students discover scholarships that match their profile.

---

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [Backend API Implementation](#backend-api-implementation)
4. [Frontend UI Implementation](#frontend-ui-implementation)
5. [Recommendation Algorithm](#recommendation-algorithm)
6. [Search Preferences](#search-preferences)
7. [Testing Strategy](#testing-strategy)

---

## Overview

### Features

1. **Scholarship Search** - Users can search scholarships by keywords, category, amount, etc.
2. **Smart Recommendations** - AI-powered suggestions based on user profile
3. **Save Preferences** - Users save search criteria for automated suggestions
4. **Track Viewed Scholarships** - Never show the same scholarship twice
5. **Save Scholarships** - Users can save interesting scholarships
6. **Auto-Add to Applications** - Convert saved scholarship to application

### User Journey

```
User logs in
     ↓
Dashboard shows personalized scholarship suggestions
     ↓
User can:
  - View suggested scholarships
  - Search for specific scholarships
  - Save scholarships for later
  - Dismiss scholarships they're not interested in
  - Add scholarship to applications
     ↓
Saved preferences influence future suggestions
```

---

## User Flow

### 1. Scholarship Discovery

**Dashboard Integration:**
```
┌──────────────────────────────────────┐
│         Dashboard                     │
├──────────────────────────────────────┤
│  Welcome back, John!                 │
│                                      │
│  📚 New Scholarships for You (5)    │
│  ┌────────────────────────────────┐ │
│  │ Merit Scholarship - STEM       │ │
│  │ $5,000 | Due: Dec 31          │ │
│  │ Match: 95% ⭐                  │ │
│  │ [View] [Save] [Dismiss]        │ │
│  └────────────────────────────────┘ │
│                                      │
│  [Browse All Scholarships →]        │
└──────────────────────────────────────┘
```

### 2. Search & Filter

**Scholarship Search Page:**
```
┌──────────────────────────────────────────────┐
│  Scholarship Search                          │
├──────────────────────────────────────────────┤
│                                              │
│  [Search: "engineering"          ] [Search] │
│                                              │
│  Filters:                                    │
│  Category: [STEM ▼]                         │
│  Amount:   [$1,000 ─────── $10,000]        │
│  Deadline: [Next 3 months ▼]                │
│  Level:    [Undergraduate ▼]                │
│                                              │
│  Results: 127 scholarships                  │
│  ┌──────────────────────────────────────┐  │
│  │ Tech Leadership Scholarship          │  │
│  │ Google | $10,000                     │  │
│  │ For CS students with leadership...   │  │
│  │ Deadline: Jan 15, 2024               │  │
│  │ [View Details] [Save]                │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  [Load More]                                 │
└──────────────────────────────────────────────┘
```

### 3. Scholarship Detail

**Scholarship Detail Page:**
```
┌──────────────────────────────────────────────┐
│  ← Back to Search                            │
├──────────────────────────────────────────────┤
│  Tech Leadership Scholarship                 │
│  Google                                      │
│                                              │
│  💰 Amount: $10,000                          │
│  📅 Deadline: January 15, 2024               │
│  🎓 Level: Undergraduate                     │
│  📚 Field: Computer Science                  │
│                                              │
│  About                                       │
│  [Full description text...]                  │
│                                              │
│  Eligibility                                 │
│  • Must be pursuing CS degree                │
│  • GPA 3.5 or higher                         │
│  • Leadership experience                     │
│                                              │
│  Requirements                                │
│  • Essay (500 words)                         │
│  • 2 Letters of recommendation               │
│  • Transcript                                │
│                                              │
│  [Apply on Website →]                        │
│  [Save to My Scholarships]                   │
│  [Create Application]                        │
└──────────────────────────────────────────────┘
```

---

## Backend API Implementation

### Phase 1: Scholarship API Endpoints

- [✅] #### Step 1.1: Create Scholarship Service

Create `api/src/services/scholarships.service.ts`:

```typescript
/**
 * Scholarship Service
 * Handles scholarship search, recommendations, and user interactions
 */
import { supabase } from '../config/supabase';
import type {
  ScholarshipSearchParams,
  ScholarshipResponse,
  UserScholarshipPreferences
} from '@scholarship-hub/shared';

export async function searchScholarships(
  params: ScholarshipSearchParams,
  userId?: number
): Promise<ScholarshipResponse[]> {
  let query = supabase
    .from('scholarships')
    .select('*')
    .eq('status', 'active')
    .gte('deadline', new Date().toISOString());

  // Keyword search (full-text search on name, description, organization)
  if (params.query) {
    query = query.or(
      `name.ilike.%${params.query}%,` +
      `description.ilike.%${params.query}%,` +
      `organization.ilike.%${params.query}%`
    );
  }

  // Category filter
  if (params.category) {
    query = query.eq('category', params.category);
  }

  // Amount range
  if (params.minAmount) {
    query = query.gte('amount', params.minAmount);
  }
  if (params.maxAmount) {
    query = query.lte('amount', params.maxAmount);
  }

  // Deadline filter
  if (params.deadlineBefore) {
    query = query.lte('deadline', params.deadlineBefore);
  }

  // Education level
  if (params.educationLevel) {
    query = query.eq('education_level', params.educationLevel);
  }

  // Field of study
  if (params.fieldOfStudy) {
    query = query.ilike('field_of_study', `%${params.fieldOfStudy}%`);
  }

  // Exclude scholarships user has already viewed/dismissed
  if (userId) {
    const { data: viewedIds } = await supabase
      .from('user_scholarships')
      .select('scholarship_id')
      .eq('user_id', userId)
      .in('status', ['viewed', 'dismissed']);

    if (viewedIds && viewedIds.length > 0) {
      query = query.not('id', 'in', `(${viewedIds.map(v => v.scholarship_id).join(',')})`);
    }
  }

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  query = query
    .order('deadline', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to search scholarships: ${error.message}`);
  }

  return data as ScholarshipResponse[];
}

export async function getScholarshipById(id: number): Promise<ScholarshipResponse> {
  const { data, error } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Scholarship not found: ${error.message}`);
  }

  return data as ScholarshipResponse;
}

export async function getRecommendedScholarships(
  userId: number,
  limit: number = 10
): Promise<ScholarshipResponse[]> {
  // Get user's profile and preferences
  const { data: user } = await supabase
    .from('users')
    .select('*, search_preferences')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Build query based on preferences
  let query = supabase
    .from('scholarships')
    .select('*')
    .eq('status', 'active')
    .gte('deadline', new Date().toISOString());

  const prefs = user.search_preferences;

  if (prefs) {
    if (prefs.targetType) {
      query = query.eq('target_type', prefs.targetType);
    }
    if (prefs.category) {
      query = query.eq('category', prefs.category);
    }
    if (prefs.minAmount) {
      query = query.gte('amount', prefs.minAmount);
    }
    if (prefs.educationLevel) {
      query = query.eq('education_level', prefs.educationLevel);
    }
  }

  // Exclude already viewed/saved/dismissed scholarships
  const { data: interactedIds } = await supabase
    .from('user_scholarships')
    .select('scholarship_id')
    .eq('user_id', userId);

  if (interactedIds && interactedIds.length > 0) {
    query = query.not('id', 'in', `(${interactedIds.map(v => v.scholarship_id).join(',')})`);
  }

  query = query
    .order('amount', { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get recommendations: ${error.message}`);
  }

  return data as ScholarshipResponse[];
}

export async function saveScholarship(
  userId: number,
  scholarshipId: number,
  matchScore?: number
): Promise<void> {
  const { error } = await supabase
    .from('user_scholarships')
    .upsert({
      user_id: userId,
      scholarship_id: scholarshipId,
      status: 'saved',
      saved_at: new Date().toISOString(),
      match_score: matchScore
    });

  if (error) {
    throw new Error(`Failed to save scholarship: ${error.message}`);
  }
}

export async function dismissScholarship(
  userId: number,
  scholarshipId: number
): Promise<void> {
  const { error } = await supabase
    .from('user_scholarships')
    .upsert({
      user_id: userId,
      scholarship_id: scholarshipId,
      status: 'dismissed',
      dismissed_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to dismiss scholarship: ${error.message}`);
  }
}

export async function markScholarshipViewed(
  userId: number,
  scholarshipId: number
): Promise<void> {
  const { error } = await supabase
    .from('user_scholarships')
    .upsert({
      user_id: userId,
      scholarship_id: scholarshipId,
      status: 'viewed',
      viewed_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to mark scholarship as viewed: ${error.message}`);
  }
}

export async function getSavedScholarships(userId: number): Promise<ScholarshipResponse[]> {
  const { data, error } = await supabase
    .from('user_scholarships')
    .select('scholarship_id, scholarships(*)')
    .eq('user_id', userId)
    .eq('status', 'saved')
    .order('saved_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get saved scholarships: ${error.message}`);
  }

  return data.map(item => item.scholarships) as ScholarshipResponse[];
}
```

- [✅] #### Step 1.2: Create API Routes

Create `api/src/routes/scholarships.routes.ts`:

```typescript
/**
 * Scholarship API Routes
 */
import express from 'express';
import { requireAuth } from '../middleware/auth';
import {
  searchScholarships,
  getScholarshipById,
  getRecommendedScholarships,
  saveScholarship,
  dismissScholarship,
  markScholarshipViewed,
  getSavedScholarships
} from '../services/scholarships.service';

const router = express.Router();

/**
 * GET /api/scholarships/search
 * Search scholarships with filters
 */
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const params = {
      query: req.query.q as string,
      category: req.query.category as string,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
      deadlineBefore: req.query.deadlineBefore as string,
      educationLevel: req.query.educationLevel as string,
      fieldOfStudy: req.query.fieldOfStudy as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const scholarships = await searchScholarships(params, req.user?.id);
    res.json(scholarships);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scholarships/recommended
 * Get personalized recommendations
 */
router.get('/recommended', requireAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const scholarships = await getRecommendedScholarships(req.user!.id, limit);
    res.json(scholarships);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scholarships/:id
 * Get scholarship by ID
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const scholarship = await getScholarshipById(id);

    // Mark as viewed
    if (req.user) {
      await markScholarshipViewed(req.user.id, id);
    }

    res.json(scholarship);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scholarships/:id/save
 * Save scholarship to user's list
 */
router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const matchScore = req.body.matchScore;

    await saveScholarship(req.user!.id, id, matchScore);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scholarships/:id/dismiss
 * Dismiss scholarship (hide from recommendations)
 */
router.post('/:id/dismiss', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await dismissScholarship(req.user!.id, id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scholarships/saved
 * Get user's saved scholarships
 */
router.get('/saved', requireAuth, async (req, res, next) => {
  try {
    const scholarships = await getSavedScholarships(req.user!.id);
    res.json(scholarships);
  } catch (error) {
    next(error);
  }
});

export default router;
```

- [✅] #### Step 1.3: Update TypeScript Types

Update `shared/src/types/scholarship.types.ts`:

```typescript
/**
 * Scholarship Types
 */

export interface ScholarshipResponse {
  id: number;
  name: string;
  organization?: string;
  amount?: number;
  description?: string;
  eligibility?: string;
  requirements?: string;

  url: string;
  applicationUrl?: string;
  sourceUrl?: string;

  deadline?: string;
  deadlineType?: 'fixed' | 'rolling' | 'varies';
  recurring?: boolean;

  category?: string;
  targetType?: string;
  educationLevel?: string;
  fieldOfStudy?: string;

  status: 'active' | 'expired' | 'invalid' | 'archived';
  verified: boolean;

  sourceType: 'scraper' | 'ai_discovery' | 'manual';
  sourceName?: string;
  discoveredAt: string;
  lastVerifiedAt?: string;
  expiresAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ScholarshipSearchParams {
  query?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  deadlineBefore?: string;
  educationLevel?: string;
  fieldOfStudy?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

export interface UserScholarshipPreferences {
  category?: string;
  targetType?: string;
  minAmount?: number;
  maxAmount?: number;
  educationLevel?: string;
  fieldOfStudy?: string;
  keywords?: string[];
}

export interface UserScholarshipInteraction {
  id: number;
  userId: number;
  scholarshipId: number;
  status: 'suggested' | 'viewed' | 'saved' | 'applied' | 'dismissed';
  viewedAt?: string;
  savedAt?: string;
  dismissedAt?: string;
  notes?: string;
  matchScore?: number;
  matchReasons?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

---

## Frontend UI Implementation

### Phase 2: Scholarship Search Pages

- [x] #### Step 2.1: Create Scholarship Search Page

Create `web/src/pages/ScholarshipSearch.tsx`:

```typescript
/**
 * Scholarship Search Page
 * Allows users to search and filter scholarships
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Input,
  Select,
  Stack,
  HStack,
  Button,
  Card,
  CardBody,
  Badge,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Spinner,
  VStack,
  Flex,
} from '@chakra-ui/react';
import { apiGet, apiPost } from '../services/api';
import type { ScholarshipResponse, ScholarshipSearchParams } from '@scholarship-hub/shared';
import { useNavigate } from 'react-router-dom';
import { useToastHelpers } from '../utils/toast';

function ScholarshipSearch() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const [scholarships, setScholarships] = useState<ScholarshipResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<ScholarshipSearchParams>({
    query: '',
    category: '',
    minAmount: 0,
    maxAmount: 50000,
    educationLevel: '',
    page: 1,
    limit: 20
  });

  const [amountRange, setAmountRange] = useState([0, 50000]);

  useEffect(() => {
    searchScholarships();
  }, [searchParams.page]);

  const searchScholarships = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (searchParams.query) queryParams.set('q', searchParams.query);
      if (searchParams.category) queryParams.set('category', searchParams.category);
      if (searchParams.minAmount) queryParams.set('minAmount', searchParams.minAmount.toString());
      if (searchParams.maxAmount) queryParams.set('maxAmount', searchParams.maxAmount.toString());
      if (searchParams.educationLevel) queryParams.set('educationLevel', searchParams.educationLevel);
      queryParams.set('page', searchParams.page!.toString());

      const data = await apiGet<ScholarshipResponse[]>(`/scholarships/search?${queryParams}`);
      setScholarships(data);
    } catch (error) {
      showError('Error', 'Failed to search scholarships');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      minAmount: amountRange[0],
      maxAmount: amountRange[1],
      page: 1
    });
    searchScholarships();
  };

  const handleSaveScholarship = async (id: number) => {
    try {
      await apiPost(`/scholarships/${id}/save`, {});
      showSuccess('Success', 'Scholarship saved to your list');
    } catch (error) {
      showError('Error', 'Failed to save scholarship');
    }
  };

  return (
    <Container maxW="7xl" py={8}>
      <Stack spacing={8}>
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>Scholarship Search</Heading>
          <Text color="gray.600">
            Find scholarships that match your profile
          </Text>
        </Box>

        {/* Search Filters */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Keyword Search */}
              <Box>
                <Text fontWeight="semibold" mb={2}>Search</Text>
                <HStack>
                  <Input
                    placeholder="Search by name, organization, or keywords..."
                    value={searchParams.query}
                    onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                  />
                  <Button colorScheme="blue" onClick={handleSearch} minW="100px">
                    Search
                  </Button>
                </HStack>
              </Box>

              {/* Filters */}
              <HStack spacing={4} flexWrap="wrap">
                {/* Category */}
                <Box flex="1" minW="200px">
                  <Text fontWeight="semibold" mb={2}>Category</Text>
                  <Select
                    value={searchParams.category}
                    onChange={(e) => setSearchParams({ ...searchParams, category: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    <option value="STEM">STEM</option>
                    <option value="Business">Business</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Arts">Arts</option>
                    <option value="Education">Education</option>
                  </Select>
                </Box>

                {/* Education Level */}
                <Box flex="1" minW="200px">
                  <Text fontWeight="semibold" mb={2}>Education Level</Text>
                  <Select
                    value={searchParams.educationLevel}
                    onChange={(e) => setSearchParams({ ...searchParams, educationLevel: e.target.value })}
                  >
                    <option value="">All Levels</option>
                    <option value="High School">High School</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Doctorate">Doctorate</option>
                  </Select>
                </Box>
              </HStack>

              {/* Amount Range */}
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Amount: ${amountRange[0].toLocaleString()} - ${amountRange[1].toLocaleString()}
                </Text>
                <RangeSlider
                  min={0}
                  max={50000}
                  step={1000}
                  value={amountRange}
                  onChange={setAmountRange}
                >
                  <RangeSliderTrack>
                    <RangeSliderFilledTrack />
                  </RangeSliderTrack>
                  <RangeSliderThumb index={0} />
                  <RangeSliderThumb index={1} />
                </RangeSlider>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Results */}
        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner size="xl" />
          </Flex>
        ) : (
          <Stack spacing={4}>
            <Text fontWeight="semibold">
              {scholarships.length} scholarship{scholarships.length !== 1 ? 's' : ''} found
            </Text>

            {scholarships.map((scholarship) => (
              <Card key={scholarship.id} _hover={{ shadow: 'md' }} cursor="pointer">
                <CardBody>
                  <Stack spacing={3}>
                    {/* Header */}
                    <Flex justify="space-between" align="start">
                      <Box flex="1">
                        <Heading size="md" mb={1}>{scholarship.name}</Heading>
                        {scholarship.organization && (
                          <Text color="gray.600" fontSize="sm">{scholarship.organization}</Text>
                        )}
                      </Box>
                      {scholarship.amount && (
                        <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                          ${scholarship.amount.toLocaleString()}
                        </Badge>
                      )}
                    </Flex>

                    {/* Description */}
                    {scholarship.description && (
                      <Text color="gray.700" noOfLines={2}>
                        {scholarship.description}
                      </Text>
                    )}

                    {/* Meta */}
                    <HStack spacing={4} fontSize="sm" color="gray.600">
                      {scholarship.deadline && (
                        <Text>📅 Due: {new Date(scholarship.deadline).toLocaleDateString()}</Text>
                      )}
                      {scholarship.category && (
                        <Badge>{scholarship.category}</Badge>
                      )}
                      {scholarship.educationLevel && (
                        <Badge>{scholarship.educationLevel}</Badge>
                      )}
                    </HStack>

                    {/* Actions */}
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => navigate(`/scholarships/${scholarship.id}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveScholarship(scholarship.id)}
                      >
                        Save
                      </Button>
                    </HStack>
                  </Stack>
                </CardBody>
              </Card>
            ))}

            {scholarships.length === 0 && !loading && (
              <Box textAlign="center" py={12}>
                <Text color="gray.500" fontSize="lg">
                  No scholarships found. Try adjusting your filters.
                </Text>
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

export default ScholarshipSearch;
```

- [ ] #### Step 2.2: Create Scholarship Detail Page

Create `web/src/pages/ScholarshipDetail.tsx`:

```typescript
/**
 * Scholarship Detail Page
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  HStack,
  Button,
  Badge,
  Card,
  CardBody,
  Spinner,
  Link as ChakraLink,
  Divider,
} from '@chakra-ui/react';
import { apiGet, apiPost } from '../services/api';
import type { ScholarshipResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function ScholarshipDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const [scholarship, setScholarship] = useState<ScholarshipResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScholarship();
  }, [id]);

  const fetchScholarship = async () => {
    try {
      setLoading(true);
      const data = await apiGet<ScholarshipResponse>(`/scholarships/${id}`);
      setScholarship(data);
    } catch (error) {
      showError('Error', 'Failed to load scholarship');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!scholarship) return;

    try {
      await apiPost(`/scholarships/${scholarship.id}/save`, {});
      showSuccess('Success', 'Scholarship saved to your list');
    } catch (error) {
      showError('Error', 'Failed to save scholarship');
    }
  };

  const handleCreateApplication = () => {
    navigate('/applications/new', {
      state: { scholarshipName: scholarship?.name }
    });
  };

  if (loading) {
    return (
      <Container maxW="4xl" py={12} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading scholarship...</Text>
      </Container>
    );
  }

  if (!scholarship) {
    return (
      <Container maxW="4xl" py={12} textAlign="center">
        <Text color="red.500">Scholarship not found</Text>
        <Button mt={4} onClick={() => navigate('/scholarships/search')}>
          Back to Search
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={8}>
      <Stack spacing={6}>
        {/* Back Button */}
        <Button
          variant="link"
          colorScheme="blue"
          onClick={() => navigate(-1)}
          alignSelf="flex-start"
        >
          ← Back
        </Button>

        {/* Header */}
        <Box>
          <Heading size="xl" mb={2}>{scholarship.name}</Heading>
          {scholarship.organization && (
            <Text fontSize="lg" color="gray.600">{scholarship.organization}</Text>
          )}
        </Box>

        {/* Key Info */}
        <Card>
          <CardBody>
            <Stack spacing={4}>
              {scholarship.amount && (
                <HStack>
                  <Text fontWeight="bold">💰 Amount:</Text>
                  <Badge colorScheme="green" fontSize="lg" px={3} py={1}>
                    ${scholarship.amount.toLocaleString()}
                  </Badge>
                </HStack>
              )}

              {scholarship.deadline && (
                <HStack>
                  <Text fontWeight="bold">📅 Deadline:</Text>
                  <Text>{new Date(scholarship.deadline).toLocaleDateString()}</Text>
                </HStack>
              )}

              {scholarship.educationLevel && (
                <HStack>
                  <Text fontWeight="bold">🎓 Level:</Text>
                  <Badge>{scholarship.educationLevel}</Badge>
                </HStack>
              )}

              {scholarship.fieldOfStudy && (
                <HStack>
                  <Text fontWeight="bold">📚 Field:</Text>
                  <Text>{scholarship.fieldOfStudy}</Text>
                </HStack>
              )}

              {scholarship.category && (
                <HStack>
                  <Text fontWeight="bold">🏷️ Category:</Text>
                  <Badge colorScheme="blue">{scholarship.category}</Badge>
                </HStack>
              )}
            </Stack>
          </CardBody>
        </Card>

        {/* Description */}
        {scholarship.description && (
          <Card>
            <CardBody>
              <Heading size="md" mb={3}>About</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.description}</Text>
            </CardBody>
          </Card>
        )}

        {/* Eligibility */}
        {scholarship.eligibility && (
          <Card>
            <CardBody>
              <Heading size="md" mb={3}>Eligibility</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.eligibility}</Text>
            </CardBody>
          </Card>
        )}

        {/* Requirements */}
        {scholarship.requirements && (
          <Card>
            <CardBody>
              <Heading size="md" mb={3}>Requirements</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.requirements}</Text>
            </CardBody>
          </Card>
        )}

        {/* Actions */}
        <Stack spacing={3}>
          <Divider />

          {scholarship.applicationUrl && (
            <Button
              as={ChakraLink}
              href={scholarship.applicationUrl}
              isExternal
              colorScheme="blue"
              size="lg"
            >
              Apply on Website →
            </Button>
          )}

          <HStack spacing={3}>
            <Button
              onClick={handleSave}
              variant="outline"
              flex="1"
            >
              Save to My Scholarships
            </Button>
            <Button
              onClick={handleCreateApplication}
              colorScheme="green"
              flex="1"
            >
              Create Application
            </Button>
          </HStack>
        </Stack>
      </Stack>
    </Container>
  );
}

export default ScholarshipDetail;
```

- [ ] #### Step 2.3: Add Dashboard Recommendations Widget

Update `web/src/pages/Dashboard.tsx` to add scholarship recommendations:

```typescript
// Add to Dashboard.tsx

import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { ScholarshipResponse } from '@scholarship-hub/shared';

// ... existing code ...

function Dashboard() {
  // ... existing state ...
  const [recommendedScholarships, setRecommendedScholarships] = useState<ScholarshipResponse[]>([]);

  useEffect(() => {
    fetchRecommendedScholarships();
  }, []);

  const fetchRecommendedScholarships = async () => {
    try {
      const data = await apiGet<ScholarshipResponse[]>('/scholarships/recommended?limit=5');
      setRecommendedScholarships(data);
    } catch (error) {
      console.error('Failed to fetch recommended scholarships', error);
    }
  };

  return (
    <Container maxW="7xl" py={8}>
      <Stack spacing={8}>
        {/* ... existing dashboard content ... */}

        {/* New Scholarships Widget */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">📚 New Scholarships for You</Heading>
              <Button
                variant="link"
                colorScheme="blue"
                onClick={() => navigate('/scholarships/search')}
              >
                Browse All →
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            {recommendedScholarships.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">
                  No new scholarships yet. Update your search preferences to get personalized suggestions.
                </Text>
                <Button
                  mt={4}
                  colorScheme="blue"
                  onClick={() => navigate('/profile')}
                >
                  Update Preferences
                </Button>
              </Box>
            ) : (
              <Stack spacing={4}>
                {recommendedScholarships.map((scholarship) => (
                  <Card
                    key={scholarship.id}
                    variant="outline"
                    _hover={{ shadow: 'sm' }}
                    cursor="pointer"
                    onClick={() => navigate(`/scholarships/${scholarship.id}`)}
                  >
                    <CardBody>
                      <Flex justify="space-between" align="start">
                        <Box flex="1">
                          <Heading size="sm" mb={1}>{scholarship.name}</Heading>
                          {scholarship.organization && (
                            <Text fontSize="sm" color="gray.600">{scholarship.organization}</Text>
                          )}
                        </Box>
                        {scholarship.amount && (
                          <Badge colorScheme="green" ml={2}>
                            ${scholarship.amount.toLocaleString()}
                          </Badge>
                        )}
                      </Flex>
                      {scholarship.deadline && (
                        <Text fontSize="sm" color="gray.500" mt={2}>
                          📅 Due: {new Date(scholarship.deadline).toLocaleDateString()}
                        </Text>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            )}
          </CardBody>
        </Card>
      </Stack>
    </Container>
  );
}
```

---

## Recommendation Algorithm

### Phase 3: Smart Matching

- [ ] #### Step 3.1: Calculate Match Score

Create `api/src/services/scholarship-matching.service.ts`:

```typescript
/**
 * Scholarship Matching Service
 * Calculates how well a scholarship matches a user's profile
 */
import type { UserProfile, ScholarshipResponse, UserScholarshipPreferences } from '@scholarship-hub/shared';

export interface MatchResult {
  score: number; // 0-100
  reasons: string[];
}

export function calculateMatchScore(
  scholarship: ScholarshipResponse,
  user: UserProfile,
  preferences?: UserScholarshipPreferences
): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const weights = {
    category: 25,
    educationLevel: 20,
    fieldOfStudy: 20,
    targetType: 15,
    amount: 10,
    deadline: 10
  };

  // Category match
  if (preferences?.category && scholarship.category === preferences.category) {
    score += weights.category;
    reasons.push(`Matches your ${scholarship.category} interest`);
  }

  // Education level match
  if (preferences?.educationLevel && scholarship.educationLevel === preferences.educationLevel) {
    score += weights.educationLevel;
    reasons.push(`Perfect for ${scholarship.educationLevel} students`);
  }

  // Field of study match
  if (preferences?.fieldOfStudy && scholarship.fieldOfStudy) {
    const userField = preferences.fieldOfStudy.toLowerCase();
    const scholarshipField = scholarship.fieldOfStudy.toLowerCase();

    if (scholarshipField.includes(userField) || userField.includes(scholarshipField)) {
      score += weights.fieldOfStudy;
      reasons.push(`Matches your ${preferences.fieldOfStudy} major`);
    }
  }

  // Target type match (Merit, Need-Based, etc.)
  if (preferences?.targetType && scholarship.targetType === preferences.targetType) {
    score += weights.targetType;
    reasons.push(`${scholarship.targetType} scholarship`);
  }

  // Amount preference
  if (preferences?.minAmount && scholarship.amount) {
    if (scholarship.amount >= preferences.minAmount) {
      score += weights.amount;
      reasons.push(`Award amount meets your minimum`);
    }
  }

  // Deadline (prefer scholarships with more time)
  if (scholarship.deadline) {
    const daysUntilDeadline = Math.floor(
      (new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline > 30) {
      score += weights.deadline;
      reasons.push(`Plenty of time to apply (${daysUntilDeadline} days)`);
    } else if (daysUntilDeadline > 14) {
      score += weights.deadline * 0.5;
      reasons.push(`Apply soon (${daysUntilDeadline} days left)`);
    }
  }

  return {
    score: Math.round(score),
    reasons
  };
}
```

---

## Search Preferences

### Phase 4: User Preferences

- [ ] #### Step 4.1: Add Search Preferences to Profile

Update `api/src/services/users.service.ts`:

```typescript
export async function updateSearchPreferences(
  userId: number,
  preferences: UserScholarshipPreferences
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ search_preferences: preferences })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update search preferences: ${error.message}`);
  }
}
```

- [ ] #### Step 4.2: Create Preferences UI

Create `web/src/components/SearchPreferencesForm.tsx`:

```typescript
/**
 * Search Preferences Form
 * Allows users to set scholarship search preferences
 */
import { useState } from 'react';
import {
  Box,
  Stack,
  FormControl,
  FormLabel,
  Select,
  Input,
  Button,
  NumberInput,
  NumberInputField,
  Text,
} from '@chakra-ui/react';
import type { UserScholarshipPreferences } from '@scholarship-hub/shared';
import { apiPut } from '../services/api';
import { useToastHelpers } from '../utils/toast';

interface Props {
  initialPreferences?: UserScholarshipPreferences;
  onSuccess?: () => void;
}

function SearchPreferencesForm({ initialPreferences, onSuccess }: Props) {
  const { showSuccess, showError } = useToastHelpers();
  const [preferences, setPreferences] = useState<UserScholarshipPreferences>(
    initialPreferences || {}
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiPut('/users/me/search-preferences', preferences);
      showSuccess('Success', 'Search preferences updated');
      onSuccess?.();
    } catch (error) {
      showError('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack spacing={4}>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Set your preferences to get personalized scholarship recommendations
        </Text>

        {/* Category */}
        <FormControl>
          <FormLabel>Preferred Category</FormLabel>
          <Select
            value={preferences.category || ''}
            onChange={(e) => setPreferences({ ...preferences, category: e.target.value })}
          >
            <option value="">Any Category</option>
            <option value="STEM">STEM</option>
            <option value="Business">Business</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Arts">Arts</option>
            <option value="Education">Education</option>
          </Select>
        </FormControl>

        {/* Education Level */}
        <FormControl>
          <FormLabel>Education Level</FormLabel>
          <Select
            value={preferences.educationLevel || ''}
            onChange={(e) => setPreferences({ ...preferences, educationLevel: e.target.value })}
          >
            <option value="">Any Level</option>
            <option value="High School">High School</option>
            <option value="Undergraduate">Undergraduate</option>
            <option value="Graduate">Graduate</option>
            <option value="Doctorate">Doctorate</option>
          </Select>
        </FormControl>

        {/* Field of Study */}
        <FormControl>
          <FormLabel>Field of Study</FormLabel>
          <Input
            placeholder="e.g., Computer Science, Nursing, Business"
            value={preferences.fieldOfStudy || ''}
            onChange={(e) => setPreferences({ ...preferences, fieldOfStudy: e.target.value })}
          />
        </FormControl>

        {/* Target Type */}
        <FormControl>
          <FormLabel>Scholarship Type</FormLabel>
          <Select
            value={preferences.targetType || ''}
            onChange={(e) => setPreferences({ ...preferences, targetType: e.target.value })}
          >
            <option value="">Any Type</option>
            <option value="Merit">Merit-Based</option>
            <option value="Need-Based">Need-Based</option>
            <option value="Athletic">Athletic</option>
            <option value="Community Service">Community Service</option>
          </Select>
        </FormControl>

        {/* Minimum Amount */}
        <FormControl>
          <FormLabel>Minimum Award Amount</FormLabel>
          <NumberInput
            min={0}
            max={100000}
            value={preferences.minAmount || 0}
            onChange={(_, value) => setPreferences({ ...preferences, minAmount: value })}
          >
            <NumberInputField placeholder="$0" />
          </NumberInput>
        </FormControl>

        {/* Save Button */}
        <Button
          colorScheme="blue"
          onClick={handleSave}
          isLoading={saving}
          size="lg"
        >
          Save Preferences
        </Button>
      </Stack>
    </Box>
  );
}

export default SearchPreferencesForm;
```

---

## Testing Strategy

### Phase 5: Testing

- [ ] #### Step 5.1: Backend Tests

Create `api/src/services/scholarships.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchScholarships,
  getRecommendedScholarships,
  calculateMatchScore
} from './scholarships.service';

describe('Scholarship Service', () => {
  it('should search scholarships with filters', async () => {
    const params = {
      query: 'engineering',
      category: 'STEM',
      minAmount: 1000
    };

    const results = await searchScholarships(params);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should get personalized recommendations', async () => {
    const userId = 1;
    const results = await getRecommendedScholarships(userId, 10);

    expect(results).toBeDefined();
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('should calculate match score correctly', () => {
    const scholarship = {
      category: 'STEM',
      educationLevel: 'Undergraduate',
      amount: 5000
    };

    const user = {
      category: 'STEM',
      educationLevel: 'Undergraduate'
    };

    const result = calculateMatchScore(scholarship, user);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
```

- [ ] #### Step 5.2: Frontend Tests

Create `web/src/pages/ScholarshipSearch.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import ScholarshipSearch from './ScholarshipSearch';
import * as api from '../services/api';

vi.mock('../services/api');

describe('ScholarshipSearch Page', () => {
  it('should render search form', () => {
    renderWithProviders(<ScholarshipSearch />);

    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
    expect(screen.getByText(/category/i)).toBeInTheDocument();
    expect(screen.getByText(/education level/i)).toBeInTheDocument();
  });

  it('should search scholarships when clicking Search button', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiGet).mockResolvedValue([
      {
        id: 1,
        name: 'Test Scholarship',
        organization: 'Test Org',
        amount: 5000
      }
    ]);

    renderWithProviders(<ScholarshipSearch />);

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    await user.type(searchInput, 'engineering');

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Test Scholarship')).toBeInTheDocument();
    });
  });
});
```

---

---

## Scholarship Discovery Options

**Status**: Deferred - To be implemented after MVP validates core tracking features

This section contains scholarship discovery features that were originally part of the main implementation plan. The MVP will focus on manual entry and tracking, with discovery features added based on user feedback.

### Overview

Scholarship discovery helps users find new scholarship opportunities within the app, rather than requiring them to search externally and manually enter details.

### Options for Future Implementation

---

### Option 1: Curated Database

**Description**: Manually curate a database of popular, high-value scholarships that users can browse and apply to.

#### Implementation Details

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

#### Pros & Cons

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

#### Estimated Effort
- Initial curation: 8-12 hours (research and data entry)
- Quarterly updates: 2-3 hours
- Annual refresh: 4-6 hours

---

### Option 2: Web Search Integration

**Description**: Integrate with Google Custom Search or Bing Search API to allow users to search the web for scholarships from within the app.

#### Implementation Details

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

#### Pros & Cons

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

#### Costs

**Google Custom Search API:**
- Free tier: 100 queries/day
- Paid: $5 per 1,000 queries
- Example: 100 users × 5 searches/day = 500 queries/day = ~$75/month

**Bing Search API:**
- Free tier: 1,000 transactions/month
- S1 tier: 1,000 transactions for $7
- Example: 500 searches/day × 30 days = 15,000/month = ~$105/month

#### Estimated Effort
- Initial implementation: 1-2 days
- Testing and refinement: 1 day
- Ongoing: Minimal maintenance

---

### Option 3: Scraper Integration

**Description**: Implement the automated scholarship scraper as originally planned.

**See**: `SCHOLARSHIP_FINDER_IMPLEMENTATION.md` for full implementation details.

**Summary:**
- Python scraper collects scholarships from various sources
- Populates `scholarship_raw_results` and `scholarships` tables
- Deduplication via fingerprinting
- Scheduled runs (daily/weekly)

**Best for:** Providing a comprehensive, always-fresh scholarship database without ongoing manual work.

---

### Option 4: Hybrid Approach

**Description**: Combine multiple approaches for maximum value.

#### Phase 1: Curated Database
- Start with 50 high-value scholarships
- Provides immediate value
- Good for marketing and demos

#### Phase 2: User Submissions
- Let users submit scholarships they find
- Community-driven growth
- Moderation queue to maintain quality

#### Phase 3: Web Search or Scraper
- Add web search for one-off queries
- OR implement scraper for automated collection
- Choose based on user feedback

---

## Extended Search & Filter Features

These features work regardless of whether scholarships are manually entered or auto-discovered.

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

### Advanced Filter Implementation

```typescript
interface ExtendedSearchCriteria {
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

// Backend service
export async function searchScholarships(
  userId: string,
  criteria: ExtendedSearchCriteria
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

## UI/UX for Discovery

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

## Recommendation for Post-MVP Enhancement

**Start with Option 1: Curated Database** because:
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
- Scraper implementation (see SCHOLARSHIP_FINDER_IMPLEMENTATION.md)
- Automated collection and deduplication
- Scheduled runs

---

## Summary

This implementation plan provides:

1. **Complete Backend API** - Search, recommendations, save/dismiss functionality
2. **Full Frontend UI** - Search page, detail page, dashboard integration
3. **Smart Recommendations** - Match scoring algorithm based on user preferences
4. **User Preferences** - Customizable search criteria
5. **Testing Coverage** - Unit and integration tests
6. **Discovery Options** - Multiple paths for adding scholarship data (curated, web search, or scraper)

**Total Implementation Time**: 2-3 weeks for core features, additional 1-4 weeks for discovery features based on chosen option
**Cost**: ~$15-30/month (mostly AI API costs if scraper used)

Next step: Begin with **SCHOLARSHIP_FINDER_IMPLEMENTATION.md** to set up the data pipeline (if using scraper), then implement this search system once you have scholarships in the database.

---

## Related Files

- Main implementation: `IMPLEMENTATION_PLAN.md`
- Finder/Scraper details: `SCHOLARSHIP_FINDER_IMPLEMENTATION.md`
- Database schema: See Migration 006 in implementation plan
