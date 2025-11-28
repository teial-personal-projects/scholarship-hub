# ScholarshipHub - AI Context Document

## Project Overview

ScholarshipHub is a scholarship application tracking system built with React, Node.js (Express), TypeScript, and Supabase. It helps students manage scholarship applications, essays, and collaborations with recommenders and essay reviewers.

**Architecture**: NPM workspace monorepo with three packages:
- `web/` - React frontend (Vite + TypeScript)
- `api/` - Node.js backend (Express + TypeScript)
- `shared/` - Shared TypeScript types and utilities

**Tech Stack**:
- **Frontend**: React 18, Vite, TypeScript, React Router, TanStack Query (for data fetching)
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Testing**: Vitest (both frontend and backend)

## Current Project Status

**Phase Completed**: Phase 1 (Database) ✅
**Currently Working On**: Phase 2 (Backend Foundation)
- Created basic server structure (`api/src/index.ts`)
- Set up configuration with environment variables
- Health check endpoint implemented

**Environment Configuration**:
- Uses `.env.local` for local development (NOT `.env`)
- Environment variables loaded based on `NODE_ENV` (defaults to 'local')
- Config file: `api/src/config/index.ts` handles env loading with fallback logic

## Folder Structure & File Roles

### Root Directory
```
scholarship-hub/
├── package.json              # Root workspace config
├── .env.local                # Local development environment variables
├── .env.example              # Template for environment variables
├── IMPLEMENTATION_PLAN.md    # Detailed implementation roadmap
├── ai-context.md            # This file
├── CLAUDE.md                # Git workflow instructions
├── web/                     # React frontend
├── api/                     # Express backend
└── shared/                  # Shared types & utilities
```

### Frontend (web/)
```
web/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx             # Application entry point
    ├── App.tsx              # Root component with providers
    ├── pages/               # Page-level route components
    │   ├── Dashboard.tsx
    │   ├── Login.tsx
    │   ├── Applications.tsx
    │   └── ApplicationDetail.tsx
    ├── components/          # Reusable UI components
    │   ├── DashboardReminders.tsx
    │   ├── ApplicationForm.tsx
    │   └── Navigation.tsx
    ├── hooks/               # Custom React hooks
    ├── contexts/            # React contexts (AuthContext, etc.)
    ├── services/            # API client
    │   └── api.ts          # Centralized API client
    └── types/               # Frontend-specific types
```

### Backend (api/)
```
api/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts             # Express server entry point
    ├── config/              # Configuration
    │   ├── index.ts         # Environment variable loader
    │   └── supabase.ts      # Supabase client initialization
    ├── routes/              # Express route definitions
    │   ├── users.routes.ts
    │   ├── applications.routes.ts
    │   ├── essays.routes.ts
    │   ├── collaborators.routes.ts
    │   └── collaborations.routes.ts
    ├── controllers/         # Request handlers
    │   ├── users.controller.ts
    │   └── applications.controller.ts
    ├── services/            # Business logic layer
    │   ├── users.service.ts
    │   ├── applications.service.ts
    │   └── reminders.service.ts
    ├── middleware/          # Express middleware
    │   ├── auth.ts          # Authentication middleware
    │   ├── error-handler.ts
    │   └── validate.ts      # Request validation (Zod)
    ├── utils/               # Backend utilities
    │   └── case-converter.ts # snake_case ↔ camelCase conversion
    ├── migrations/          # SQL migration files
    │   ├── 001_users_profiles.sql
    │   ├── 002_applications.sql
    │   ├── 003_essays.sql
    │   ├── 004_collaborators.sql
    │   └── 005_recommendations.sql
    └── test/                # Test files
        ├── setup.ts
        ├── helpers/
        └── fixtures/
```

### Shared (shared/)
```
shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts             # Main export
    ├── types/               # Shared TypeScript types
    │   ├── user.types.ts
    │   ├── application.types.ts
    │   ├── essay.types.ts
    │   ├── collaborator.types.ts
    │   ├── recommendation.types.ts
    │   └── search.types.ts
    ├── constants/           # Shared constants
    │   ├── application.constants.ts
    │   └── collaboration.constants.ts
    └── utils/               # Shared utilities
        ├── validation.ts    # Zod schemas
        └── formatting.ts    # Date, currency formatters
```

## Database Schema

### Naming Conventions
- **Database**: snake_case (e.g., `user_id`, `created_at`)
- **TypeScript**: camelCase (e.g., `userId`, `createdAt`)
- **Primary Keys**: Always named `id` (BIGSERIAL)
- **Foreign Keys**: `table_name_id` format (e.g., `application_id`, `user_id`)

### Core Tables

#### user_profiles
```sql
CREATE TABLE public.user_profiles (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email_address TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Important**: Only `user_profiles` references `auth.users`. All other tables reference `user_profiles.id`.

#### applications
```sql
CREATE TABLE public.applications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES user_profiles(id),
  scholarship_name TEXT NOT NULL,
  target_type target_type,          -- ENUM: 'Merit' | 'Need' | 'Both'
  organization TEXT,
  status application_status,         -- ENUM: 'Not Started' | 'In Progress' | 'Submitted' | 'Awarded' | 'Not Awarded'
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### essays
```sql
CREATE TABLE public.essays (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT REFERENCES applications(id),
  theme TEXT,
  word_count INTEGER,
  essay_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### collaborators
```sql
CREATE TABLE public.collaborators (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES user_profiles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  relationship TEXT,  -- e.g., 'Teacher', 'Counselor'
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Note**: No `collaborator_type` field - same person can have multiple collaboration types.

#### collaborations (Polymorphic Design)
```sql
CREATE TABLE public.collaborations (
  id BIGSERIAL PRIMARY KEY,
  collaborator_id BIGINT REFERENCES collaborators(id),
  application_id BIGINT REFERENCES applications(id),
  collaboration_type collaboration_type,  -- ENUM: 'recommendation' | 'essayReview' | 'guidance'
  status collaboration_status,
  awaiting_action_from action_owner,     -- ENUM: 'student' | 'collaborator'
  next_action_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Type-Specific Tables**:
- `essay_review_collaborations` - Links to `essays`, tracks draft versions
- `recommendation_collaborations` - Portal URLs, submission status
- `guidance_collaborations` - Session type, meeting URLs

#### recommendations
```sql
CREATE TABLE public.recommendations (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT REFERENCES applications(id),
  recommender_id BIGINT REFERENCES collaborators(id),
  status recommendation_status,  -- ENUM: 'Pending' | 'Submitted'
  submitted_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

**Critical Pattern**: Never compare `user_id = auth.uid()` directly (BIGINT vs UUID mismatch).

**Correct RLS Pattern**:
```sql
CREATE POLICY "Users can view own applications" ON public.applications
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
```

## API Design

### Authentication
- All protected routes require Supabase JWT token
- Auth middleware extracts user from token: `req.user`
- Routes use `/api/users/me` pattern for current user

### Endpoint Structure
```
/api/users/me                          # Current user profile
/api/users/me/search-preferences       # User's search preferences
/api/users/me/reminders                # Dashboard reminders

/api/applications                      # List user's applications
/api/applications/:id                  # Get/Update/Delete application

/api/applications/:applicationId/essays  # Nested essays
/api/essays/:id                         # Direct essay access

/api/collaborators                     # List user's collaborators
/api/collaborators/:id                 # Get/Update/Delete collaborator

/api/collaborations                    # Create collaboration
/api/collaborations/:id                # Get/Update/Delete collaboration
/api/collaborations/:id/history        # Collaboration history

/api/recommendations                   # Recommendations for application
/api/recommendations/:id               # Update recommendation status
```

### Request/Response Pattern
- **Database → API**: Convert snake_case to camelCase
- **API → Database**: Convert camelCase to snake_case
- Use utility functions in `api/src/utils/case-converter.ts`

## Key Features

### Dashboard Reminders
- `GET /api/users/me/reminders` returns:
  - Applications due soon (within 7 days)
  - Overdue applications
  - Collaborations due soon
  - Overdue collaborations
  - Pending collaborator responses
- Color-coded UI: Red (overdue), Yellow (3 days), Blue (7 days)

### Automated Email Reminders
- Scheduled cron job: `POST /api/cron/send-reminders`
- Email types:
  - Student: Application due soon/overdue
  - Collaborator: New request, due soon, overdue
- Configurable intervals (e.g., 7, 3, 1 days before due date)
- Tracks `last_reminder_sent_at` to avoid spam

### Collaboration System
- Unified collaborator entity (no type label)
- Polymorphic collaborations (base + type-specific tables)
- Tracks action ownership (student vs collaborator)
- History logging for all actions

## Development Workflow

### Running the Application
```bash
# Install dependencies (from root)
npm install

# Run type checking
npm run type-check --workspace=api
npm run type-check --workspace=web

# Build shared package first
npm run build --workspace=shared

# Start development servers
npm run dev --workspace=api     # Backend on :3001
npm run dev --workspace=web     # Frontend on :5173
```

### Environment Variables
Location: `.env.local` at project root

Required variables:
```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Backend
PORT=3001
NODE_ENV=local

# Frontend
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Git Workflow (from CLAUDE.md)
Before committing:
1. `git add -A`
2. `git status --short -M`
3. `git diff --stat`
4. Draft commit message
5. **STOP and ask**: "Ready to commit?"
6. Wait for user confirmation before running `git commit`

### Testing
```bash
# Run tests
npm test --workspace=api
npm test --workspace=web

# Run tests with UI
npm run test:ui --workspace=api

# Coverage
npm run test:coverage --workspace=api
```

## Project Conventions

### TypeScript
- Strict mode enabled
- All types defined in `shared/src/types/`
- Use discriminated unions for polymorphic types
- Export types from `shared/src/index.ts`

### Code Style
- Use ESLint and Prettier
- Prefer `const` over `let`
- Use async/await over promises
- Descriptive variable names
- Comments for complex logic only

### Component Patterns (Frontend)
- Functional components with hooks
- Custom hooks for data fetching (TanStack Query)
- Context for global state (Auth)
- Props interfaces for all components

### Service Layer (Backend)
- Controllers handle HTTP concerns
- Services contain business logic
- Keep controllers thin
- Return typed responses
- Handle errors gracefully

### Database Queries
- Use Supabase client
- Always use RLS policies
- Join through `user_profiles` for auth checks
- Use transactions for multi-table updates

## Important Design Decisions

### 1. No Scholarship Discovery (MVP)
Students find scholarships externally and create applications directly. Scholarship discovery/search deferred to future phase. See `SCHOLARSHIP_DISCOVERY_PHASE.md`.

### 2. Collaborator Design
- No `collaborator_type` field (redundant)
- Same person can have multiple collaboration types
- Type determined by `collaborations.collaboration_type`
- Flexible and extensible

### 3. Case Conversion
- Database uses snake_case
- TypeScript uses camelCase
- Conversion happens at API boundary
- Utility functions handle bidirectional conversion

### 4. Authentication Flow
- Supabase handles auth
- Backend uses service role key (bypasses RLS)
- RLS policies enforce data access rules
- Frontend uses anon key with user JWT

## Future Enhancements

Planned for later phases (see IMPLEMENTATION_PLAN.md):
- Scholarship discovery and search
- Saved filter preferences
- In-app notifications (beyond email)
- Calendar integration
- Document management (file uploads)
- Analytics and reporting
- Mobile app

## Helpful Commands Reference

```bash
# Workspace commands (run from root)
npm install                           # Install all dependencies
npm run build --workspace=shared      # Build shared package
npm run dev -w api                    # Start API server (shorthand)
npm run dev -w web                    # Start frontend (shorthand)

# Database
# Run migrations in Supabase SQL Editor
# Import test data from api/src/mocks/output/import-data-final.sql

# Git
git status --short -M                 # See what changed
git diff --stat                       # See file changes summary
```

## Priming Prompt for Claude

"This is ScholarshipHub, a React + Express + Supabase scholarship tracking app built as an NPM workspace monorepo. Review the project structure in ai-context.md before making changes. Key patterns:

1. **Database**: snake_case, primary key is `id`, foreign keys are `table_name_id`
2. **TypeScript**: camelCase, types in `shared/src/types/`
3. **RLS**: Always join through `user_profiles` to check `auth_user_id = auth.uid()`
4. **Environment**: Uses `.env.local`, loaded based on `NODE_ENV`
5. **Testing**: Vitest for both frontend and backend
6. **Conventions**: See CLAUDE.md for git workflow, IMPLEMENTATION_PLAN.md for roadmap

When I request changes:
- Determine which files need updating
- Provide complete code, not just snippets
- Follow existing patterns in codebase
- Update all related files in one response
- Maintain type safety across frontend/backend
- Don't create unnecessary files

Current phase: Phase 2 (Backend Foundation)"
