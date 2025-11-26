# Collaborator Consolidation - Design Decision

## Summary

**Decision**: Consolidate `Recommenders` and `Collaborators` into a single unified `Collaborators` entity.

## Rationale

Both recommenders and essay helpers are fundamentally **people who collaborate with students** on their scholarship applications. They differ only in the **type of help** they provide, not in their fundamental nature.

## Schema Design

### Old Design (Separate Tables)
```
recommenders table
recommendations table
recommendation_history table

collaborators table (essay helpers)
collaborations table
collaboration_history table
```

**Problems:**
- Code duplication (similar CRUD operations for both)
- Redundant database tables with nearly identical structures
- A person could be both a recommender AND an essay helper → needs 2 records
- Harder to query "all people helping this student"

### New Design (Polymorphic with Type-Specific Tables)
```
collaborators table
  - collaborator_type: 'recommender' | 'essayEditor' | 'counselor'

collaborations table (base table)
  - collaboration_type: 'recommendation' | 'essayReview' | 'guidance'
  - awaiting_action_from: 'student' | 'collaborator' | null
  - awaiting_action_type: action type enum

essay_review_collaborations table (type-specific)
  - essay_id (required)
  - current_draft_version, feedback_rounds, etc.

recommendation_collaborations table (type-specific)
  - portal_url, questionnaire_completed, etc.

guidance_collaborations table (type-specific)
  - session_type, meeting_url, etc.

collaboration_history table
```

**Benefits:**
- ✅ Single source of truth for all collaborators
- ✅ One person can have multiple collaboration types
- ✅ Type-specific data properly structured with foreign keys
- ✅ Action tracking: students and collaborators know who acts next
- ✅ Easier to add new types later (e.g., 'mentor', 'coach')
- ✅ Better UX - manage all helpers in one place + clear action ownership

## Database Schema

### Enums

```sql
CREATE TYPE collaborator_type AS ENUM (
  'recommender',    -- Writes recommendation letters
  'essayEditor',    -- Reviews and edits essays
  'counselor'       -- Provides general guidance
);

CREATE TYPE collaboration_type AS ENUM (
  'recommendation',  -- Recommendation letter for application
  'essayReview',     -- Essay review/editing
  'guidance'         -- General application guidance
);

CREATE TYPE collaboration_status AS ENUM (
  'pending',
  'invited',
  'in_progress',
  'submitted',
  'completed',
  'declined'
);

CREATE TYPE action_owner AS ENUM (
  'student',
  'collaborator'
);

CREATE TYPE session_type AS ENUM (
  'initial',
  'followup',
  'final'
);
```

### Tables

#### `collaborators`
Stores information about people who help students.

```sql
CREATE TABLE public.collaborators (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- NULL until they sign up
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  collaborator_type collaborator_type NOT NULL,
  relationship TEXT, -- e.g., 'Teacher', 'Counselor', 'Tutor'
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `collaborations` (Base Table)
Links collaborators to specific applications with common fields.

```sql
CREATE TABLE public.collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaborator_id BIGINT REFERENCES public.collaborators(id) ON DELETE CASCADE NOT NULL,
  application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  collaboration_type collaboration_type NOT NULL,
  status collaboration_status DEFAULT 'pending',

  -- Action tracking fields
  awaiting_action_from action_owner,
  awaiting_action_type TEXT,
  next_action_description TEXT,
  next_action_due_date DATE,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(collaborator_id, application_id, collaboration_type)
);
```

#### `essay_review_collaborations` (Type-Specific)
Stores essay review-specific data.

```sql
CREATE TABLE public.essay_review_collaborations (
  collaboration_id BIGINT PRIMARY KEY REFERENCES public.collaborations(id) ON DELETE CASCADE,
  essay_id BIGINT REFERENCES public.essays(id) ON DELETE CASCADE NOT NULL,

  -- Essay review tracking
  current_draft_version INT DEFAULT 0,
  feedback_rounds INT DEFAULT 0,
  last_feedback_at TIMESTAMPTZ
);
```

#### `recommendation_collaborations` (Type-Specific)
Stores recommendation-specific data.

```sql
CREATE TABLE public.recommendation_collaborations (
  collaboration_id BIGINT PRIMARY KEY REFERENCES public.collaborations(id) ON DELETE CASCADE,

  -- Recommendation tracking
  portal_url TEXT,
  portal_deadline DATE,
  questionnaire_completed BOOLEAN DEFAULT FALSE,
  letter_submitted_at TIMESTAMPTZ
);
```

#### `guidance_collaborations` (Type-Specific)
Stores guidance/counseling-specific data.

```sql
CREATE TABLE public.guidance_collaborations (
  collaboration_id BIGINT PRIMARY KEY REFERENCES public.collaborations(id) ON DELETE CASCADE,

  -- Guidance tracking
  session_type session_type,
  meeting_url TEXT,
  scheduled_for TIMESTAMPTZ
);
```

**Key Points:**
- Base `collaborations` table has all common fields including action tracking
- Type-specific tables have 1:1 relationship with base table
- `essay_id` is in `essay_review_collaborations` with NOT NULL constraint
- Each type can have its own workflow-specific fields
- A collaborator can only have one collaboration of each type per application
- Action tracking shows who needs to act next and what action is needed

#### `collaboration_history`
Audit log of all collaboration actions.

```sql
CREATE TABLE public.collaboration_history (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## TypeScript Types

### Before (Separate)
```typescript
interface Recommender {
  recommenderId: number;
  userId: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  // ...
}

interface Recommendation {
  recommendationId: number;
  applicationId: number;
  recommenderId: number;
  status: RecommendationStatus;
  // ...
}

interface Collaborator {
  collaboratorId: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  // ...
}

interface Collaboration {
  collaborationId: number;
  collaboratorId: number;
  applicationId: number;
  essayId?: number;
  // ...
}
```

### After (Unified + Polymorphic)
```typescript
type CollaboratorType = 'recommender' | 'essayEditor' | 'counselor';
type CollaborationType = 'recommendation' | 'essayReview' | 'guidance';
type CollaborationStatus =
  | 'pending'
  | 'invited'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'declined';

type ActionOwner = 'student' | 'collaborator' | null;

// Type-specific action types
type EssayActionType =
  | 'acceptance'
  | 'essayDraft'
  | 'essayFeedback'
  | 'essayRevision'
  | 'finalApproval';

type RecommendationActionType =
  | 'acceptance'
  | 'completeQuestionnaire'
  | 'providePortalUrl'
  | 'uploadLetter'
  | 'submitToPortal'
  | 'confirmation';

type GuidanceActionType =
  | 'acceptance'
  | 'scheduleSession'
  | 'attendSession'
  | 'followUp'
  | 'reviewProgress';

interface Collaborator {
  collaboratorId: number;
  userId?: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  collaboratorType: CollaboratorType;
  relationship?: string;
  phoneNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Base collaboration with common fields
interface BaseCollaboration {
  collaborationId: number;
  collaboratorId: number;
  applicationId: number;
  collaborationType: CollaborationType;
  status: CollaborationStatus;

  // Action tracking
  awaitingActionFrom: ActionOwner;
  awaitingActionType?: string;
  nextActionDescription?: string;
  nextActionDueDate?: Date;

  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Type-specific collaborations
interface EssayReviewCollaboration extends BaseCollaboration {
  collaborationType: 'essayReview';
  essayId: number; // Required
  awaitingActionType?: EssayActionType;
  currentDraftVersion?: number;
  feedbackRounds?: number;
  lastFeedbackAt?: Date;
}

interface RecommendationCollaboration extends BaseCollaboration {
  collaborationType: 'recommendation';
  awaitingActionType?: RecommendationActionType;
  portalUrl?: string;
  portalDeadline?: Date;
  questionnaireCompleted?: boolean;
  letterSubmittedAt?: Date;
}

interface GuidanceCollaboration extends BaseCollaboration {
  collaborationType: 'guidance';
  awaitingActionType?: GuidanceActionType;
  sessionType?: 'initial' | 'followup' | 'final';
  meetingUrl?: string;
  scheduledFor?: Date;
}

// Discriminated union
type Collaboration =
  | EssayReviewCollaboration
  | RecommendationCollaboration
  | GuidanceCollaboration;

interface CollaborationHistory {
  id: number;
  collaborationId: number;
  action: string;
  details?: string;
  createdAt: Date;
}
```

**Benefits of TypeScript Design:**
- ✅ Type narrowing works perfectly with `collaboration.collaborationType`
- ✅ `essayId` is guaranteed to exist when type is 'essayReview'
- ✅ Each type has its own specific action types for type safety
- ✅ Action tracking is built into every collaboration type
```

## API Endpoints

### Collaborators
```
POST   /api/collaborators              - Add a new collaborator
GET    /api/collaborators              - List all (can filter by type)
GET    /api/collaborators/:id          - Get one collaborator
PATCH  /api/collaborators/:id          - Update collaborator
DELETE /api/collaborators/:id          - Remove collaborator
```

### Collaborations
```
POST   /api/collaborations             - Create collaboration
GET    /api/applications/:id/collaborations - Get all for application
GET    /api/essays/:id/collaborations - Get all for essay
GET    /api/collaborations/:id        - Get one collaboration
PATCH  /api/collaborations/:id        - Update status/notes
DELETE /api/collaborations/:id        - Remove collaboration

POST   /api/collaborations/:id/invite - Send invitation email
POST   /api/collaborations/:id/history - Log action
```

## Use Cases

### Use Case 1: Recommendation Letter
```typescript
// 1. Student adds a recommender
const recommender = await createCollaborator({
  firstName: 'Dr. Smith',
  lastName: 'Johnson',
  emailAddress: 'smith@school.edu',
  collaboratorType: 'recommender',
  relationship: 'AP Physics Teacher'
});

// 2. Student requests recommendation for an application
const collaboration = await createCollaboration({
  collaboratorId: recommender.id,
  applicationId: applicationId,
  collaborationType: 'recommendation',
  dueDate: '2024-12-15',
  notes: 'Please focus on my physics research project'
});

// 3. Send invitation
await sendCollaborationInvite(collaboration.id);
```

### Use Case 2: Essay Review
```typescript
// 1. Student adds an essay editor
const editor = await createCollaborator({
  firstName: 'Jane',
  lastName: 'Doe',
  emailAddress: 'jane@writingcenter.edu',
  collaboratorType: 'essayEditor',
  relationship: 'Writing Center Tutor'
});

// 2. Student requests essay review
const collaboration = await createCollaboration({
  collaboratorId: editor.id,
  applicationId: applicationId,
  essayId: essayId, // Required!
  collaborationType: 'essayReview',
  dueDate: '2024-11-30',
  notes: 'First draft - need help with structure'
});

// 3. Send invitation
await sendCollaborationInvite(collaboration.id);
```

### Use Case 3: One Person, Multiple Roles
A school counselor can be both a recommender AND provide general guidance:

```typescript
// 1. Add counselor
const counselor = await createCollaborator({
  firstName: 'Ms.',
  lastName: 'Rodriguez',
  emailAddress: 'rodriguez@school.edu',
  collaboratorType: 'counselor', // Primary type
  relationship: 'School Counselor'
});

// 2. Request recommendation
const recommendation = await createCollaboration({
  collaboratorId: counselor.id,
  applicationId: app1Id,
  collaborationType: 'recommendation'
});

// 3. Also request guidance on different application
const guidance = await createCollaboration({
  collaboratorId: counselor.id,
  applicationId: app2Id,
  collaborationType: 'guidance'
});

// Same person, two different types of help!
```

## UI/UX Changes

### Student View

**Collaborators Page** (replaces separate Recommenders/Collaborators pages):
- Tabs: All | Recommenders | Essay Editors | Counselors
- List view showing all collaborators with their types
- "Add Collaborator" button → form with type selector

**Application Detail Page**:
- Section: "Recommendations"
  - Shows all collaboration_type='recommendation' for this app
  - Status, due date, actions (send reminder, view history)
- Section: "Essay Reviews"
  - Shows all collaboration_type='essayReview' for this app's essays
  - Grouped by essay

### Collaborator View

**Collaborator Dashboard**:
- Tabs by type: Recommendations | Essay Reviews | Guidance
- Shows all assigned work
- Mark status, add notes, submit work

## Migration Path (Future)

If migrating from the old split design:

```sql
-- Migrate recommenders to collaborators
INSERT INTO collaborators (user_id, first_name, last_name, email, collaborator_type, relationship, phone_number, created_at, updated_at)
SELECT user_id, first_name, last_name, email, 'recommender', relationship, phone_number, created_at, updated_at
FROM recommenders;

-- Migrate recommendations to collaborations
INSERT INTO collaborations (collaborator_id, application_id, collaboration_type, status, submitted_at, due_date, created_at, updated_at)
SELECT
  c.id as collaborator_id,
  r.application_id,
  'recommendation' as collaboration_type,
  r.status,
  r.submitted_at,
  r.due_date,
  r.created_at,
  r.updated_at
FROM recommendations r
JOIN recommenders old_r ON old_r.id = r.recommender_id
JOIN collaborators c ON c.email = old_r.email;

-- Similar for old collaborators table...
```

## Summary

This unified design is:
- ✅ **Simpler** - fewer tables, less code duplication
- ✅ **More flexible** - easy to add new collaborator/collaboration types
- ✅ **Better UX** - students manage all helpers in one place
- ✅ **More realistic** - reflects that one person can help in multiple ways
- ✅ **Easier to maintain** - one set of CRUD operations, one set of policies
