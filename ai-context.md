# ScholarshipHub - AI Context Document

## Project Overview

ScholarshipHub is a scholarship application tracking system built with React, Node.js (Express), TypeScript, and Supabase. It helps students manage scholarship applications, essays, and collaborations with recommenders and essay reviewers.

**Architecture**: NPM workspace monorepo with three packages:
- `web/` - React frontend (Vite + TypeScript)
- `api/` - Node.js backend (Express + TypeScript)
- `shared/` - Shared TypeScript types and utilities

**Tech Stack**:
- **Frontend**: React 18, Vite, TypeScript, React Router, TanStack Query (for data fetching)
- **Backend**: Node.js 24.12+, Express, TypeScript
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
├── docs/                     # Documentation (see docs/scholarship_hub_architecture.md)
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
    ├── index.ts             # Main export - exports ALL types and utils
    ├── types/               # Shared TypeScript types
    │   ├── user.types.ts                    # Domain types (for database/business logic)
    │   ├── application.types.ts             # Domain types
    │   ├── essay.types.ts                   # Domain types
    │   ├── collaborator.types.ts            # Domain types
    │   ├── recommendation.types.ts          # Domain types
    │   ├── user-search-preferences.types.ts # Domain types
    │   ├── scholarship-search.types.ts      # Search types
    │   ├── api-responses.types.ts           # API response types (camelCase)
    │   ├── reminders.types.ts               # Dashboard reminders
    │   └── application.constants.ts         # Enums and constants
    └── utils/               # Shared utilities
        ├── case-conversion.ts  # snake_case ↔ camelCase conversion
        ├── validation.ts       # Zod schemas (placeholder)
        └── formatting.ts       # Date, currency formatters (placeholder)
```

**IMPORTANT: Shared Types Usage Guidelines**

1. **NEVER define types locally in React components or API controllers**
   - ❌ Bad: Defining `interface Application { ... }` in `Dashboard.tsx`
   - ✅ Good: Import `ApplicationResponse` from `@scholarship-hub/shared`

2. **Two categories of types in shared package:**
   - **Domain Types** (`application.types.ts`, `user.types.ts`, etc.):
     - Represent business entities and database models
     - May use different field names than API (e.g., `applicationId` vs `id`)
     - Used for internal business logic

   - **API Response Types** (`api-responses.types.ts`):
     - Represent the EXACT shape of API responses after camelCase conversion
     - Use `id` not `applicationId` (matches database primary key after conversion)
     - Frontend should ALWAYS use these types
     - Examples: `UserProfile`, `ApplicationResponse`, `CollaborationResponse`

3. **When to add a new type to shared:**
   - If both web and api need it → shared/types
   - If only frontend-specific (e.g., UI state) → web/src/types
   - If only backend-specific (e.g., internal utilities) → api/src/types
   - **Default assumption: If in doubt, put it in shared**

4. **Updating shared types workflow:**
   ```bash
   # 1. Edit type in shared/src/types/
   # 2. Rebuild shared package
   npm run build --workspace=shared
   # 3. Types are immediately available to web and api
   ```

5. **Import pattern:**
   ```typescript
   // ✅ Good - Import from shared package
   import type { UserProfile, ApplicationResponse } from '@scholarship-hub/shared';

   // ❌ Bad - Defining locally
   interface UserProfile { ... }
   ```

6. **Type naming conventions:**
   - Domain types: `Application`, `User`, `Collaboration`
   - API responses: `ApplicationResponse`, `UserProfile`, `CollaborationResponse`
   - Request bodies: `CreateApplicationRequest`, `UpdateUserRequest`
   - Constants/Enums: Prefix with `T` (e.g., `TApplicationStatus`, `TTargetType`)

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

## React Best Practices & Patterns Checklist

**Use this as a checklist/rubric when generating or refactoring React code.**

### Core React Patterns

- Prefer **functional** components and Hooks; treat class components as legacy unless integrating with old code.
- Keep components small, focused, and single‑responsibility; if a component grows beyond ~150–200 lines or handles several concerns, split it.
- Co-locate logic with the component that owns it (state, derived data, effects, queries) instead of scattering utilities and hooks across the app.
- Use composition over inheritance: accept children/slots instead of deeply nested prop options or config objects.
- Use controlled components for form elements whenever you need validation, instant feedback, or complex interactions; otherwise consider uncontrolled refs for simple cases.

### State and Data Fetching

- Keep state as **local** as possible; lift state only when multiple components truly share it.
- Avoid prop drilling across many levels; use Context for cross-cutting concerns and consider a lightweight state library (Zustand, Jotai, Redux Toolkit) for complex global state.
- Store the minimal state needed; derive everything else from props or existing state instead of duplicating values.
- Treat server as the source of truth for server data and client state as a cache or view model.
- Use a dedicated data-fetching library (TanStack Query / React Query or SWR) instead of ad‑hoc useEffect + fetch for anything beyond trivial requests.
- Normalize async flows: handle loading, error, empty, and success states explicitly and consistently.

### React 18 Features and Concurrency

- Use Suspense for data fetching and code-splitting boundaries to improve perceived loading and structure async flows.
- Use concurrent APIs like useTransition and useDeferredValue to keep the UI responsive during expensive updates or filtering.
- Design UI so that non‑critical parts can be deferred or streamed rather than blocking the initial render.

### Performance and Rendering

- Minimize unnecessary re-renders:
  - Use React.memo for pure presentational components with stable props.
  - Use useCallback and useMemo for expensive computations or when prop identity matters (e.g., passed to memoized children).
- Avoid inline anonymous functions and object/array literals in hot rendering paths when they cause prop identity churn.
- Use stable, unique keys for list items; never use array index as key when list can be reordered or filtered.
- Virtualize large lists and tables to avoid rendering hundreds/thousands of DOM nodes.
- Avoid overusing Context; large or frequently changing contexts can trigger expensive tree-wide re-renders—consider splitting context or using selectors/state libraries.
- Split bundles using dynamic import and React.lazy for heavy, rarely used routes or components.
- Regularly profile the app (React DevTools Profiler, Web Vitals, browser performance tools) and optimize based on real bottlenecks, not guesses.

### Structure, Organization, and Reuse

- Organize files by feature/module instead of strictly by type; keep components, hooks, and tests for a feature together.
- Extract reusable UI patterns as shared components and shared hooks (e.g., useForm, useModal, useFetch) to avoid duplication.
- Keep hooks pure: avoid doing non‑React side effects directly in custom hooks unless the hook is specifically about that effect, and document clearly when they occur.
- Prefer simple, predictable naming: useFoo for hooks, PascalCase for components, clear prop names instead of abbreviations.
- Co-locate tests, styles, and stories with their components to improve discoverability and refactoring.

### TypeScript and Safety

- Use TypeScript (or at least JSDoc types) for components, hooks, and utilities to catch errors at compile time and improve IDE help.
- Prefer typed props and state over any/unknown; model domain concepts with discriminated unions instead of booleans when multiple states are possible.
- Type external data at the boundary (e.g., API responses), and consider runtime validation for untrusted inputs.

### JSX, Styling, and DOM

- Keep JSX clean and readable; avoid deeply nested markup by extracting subcomponents.
- Avoid putting complex logic directly in JSX; move it into variables or helper functions above the return.
- Use semantic HTML tags and ARIA attributes; avoid div‑soup, especially for interactive elements.
- Prefer CSS modules, utility CSS (like Tailwind), or well‑structured CSS‑in‑JS with attention to performance; avoid global styles that leak across features.
- Use modern image optimizations (lazy loading, responsive images, modern formats, or framework-level image components) for performance.

### Side Effects and Lifecycle

- Use useEffect only for real side effects (subscriptions, event listeners, imperative APIs, syncing with non‑React systems), not for synchronous derivations that can be computed during render.
- Carefully manage effect dependencies; prefer making effects idempotent and narrowing their scope instead of disabling lint rules.
- Clean up subscriptions, timers, event listeners, and observers in the effect cleanup function to prevent leaks.
- Avoid "fetch in every effect" anti‑pattern; centralize data fetching via libraries or well-designed hooks.

### Error Handling, Boundaries, and UX

- Use Error Boundaries around major app sections (routes, dashboards, complex widgets) to avoid full app crashes.
- Provide meaningful fallbacks for loading and error states (skeletons/spinners + retry, not just blank or generic messages).
- Design for progressive enhancement: render useful content early and progressively hydrate/upgrade with client interactivity.

### Testing and Maintainability

- Write tests for critical flows (auth, payments, core workflows) using Jest/Vitest for unit tests and React Testing Library for behavior-focused component tests.
- Use Cypress/Playwright (or similar) for end‑to‑end tests on key user journeys.
- Favor testing behavior and user-visible outcomes rather than implementation details or specific hook calls.
- Keep strict ESLint + Prettier (or equivalent) configs and ensure code always passes lint/format checks.

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
6. **Conventions**: See CLAUDE.md for git workflow, docs/scholarship_hub_architecture.md for architecture

When I request changes:
- Determine which files need updating
- Provide complete code, not just snippets
- Follow existing patterns in codebase
- Update all related files in one response
- Maintain type safety across frontend/backend
- Don't create unnecessary files
- **For React code**: Follow the React Best Practices & Patterns Checklist above

Current phase: Phase 4 (Backend Foundation)"
