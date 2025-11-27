# ScholarshipHub - Detailed Implementation Plan

## Executive Summary

This plan transforms your existing `scholarship-tracker` (Vue + Express + MySQL + Auth0) into the new `ScholarshipHub` (React + Node.js + Supabase) as specified in your requirements.

### Key Architectural Decisions

#### 1. Type Sharing Strategy: NPM Workspace (Recommended)
**Current Setup**: Git submodules pointing to separate `scholarship-types` repo
**Recommended**: NPM workspace monorepo with local packages

**Why Change?**
- ✅ Simpler dev experience (no submodule updates)
- ✅ Type changes instantly available across all packages
- ✅ Single `npm install` at root
- ✅ Easier CI/CD
- ✅ No git submodule complexity
- ❌ Types not separately versionable (but you don't need this for a single app)

**Alternative**: Keep git submodules if you plan to:
- Share types with other projects
- Version types independently
- Have multiple teams with different release cycles

**Recommendation**: Use NPM workspace for this project.

**Structure Choice**: We're using a **flat structure** (`web/`, `api/`, `shared/` at root) rather than nested `packages/` subdirectory. This minimizes nesting while maintaining clear organization and full NPM workspace benefits.

#### 2. Tech Stack Alignment

**Current** → **Target**
- Vue 3/Quasar → React + TypeScript (Vite SPA)
- Express.js → Node.js (we'll use Fastify for performance, or stick with Express if you prefer)
- MySQL + Knex → Supabase (PostgreSQL)
- Auth0 → Supabase Auth

#### 3. Migration vs Fresh Start

**Recommendation**: Fresh start with lessons learned, for these reasons:
- Clean separation of concerns from day 1
- Proper PostgreSQL schema design (vs adapted MySQL)
- Supabase-first architecture
- React best practices vs Vue migration

**What to Reuse from Existing Projects**:
- ✅ **Types**: Copy from `/Users/teial/Tutorials/scholarship-types/` to `shared/src/types/`
- ✅ **Business Logic**: Reference patterns from `scholarship-tracker/server/src/`
- ✅ **Domain Knowledge**: User flows, data models, API design patterns
- ✅ **Lessons Learned**: What worked, what didn't in the old project

**What NOT to Migrate**:
- ❌ Vue/Quasar frontend → Build fresh in React
- ❌ MySQL schema → Design fresh for PostgreSQL
- ❌ Auth0 integration → Use Supabase Auth
- ❌ Knex.js queries → Use Supabase client

---

## Project Structure

```
scholarship-hub/
├── package.json                 # Root workspace config
├── .env.example
├── .env.local
├── .gitignore
├── README.md
├── IMPLEMENTATION_PLAN.md       # This file
│
├── web/                         # React frontend (Vite SPA)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── assets/              # Images, fonts, etc.
│       ├── components/          # Reusable UI components
│       ├── hooks/               # Custom React hooks
│       ├── pages/               # Page components (routes)
│       ├── services/            # API client, external services
│       ├── contexts/            # React contexts (auth, etc.)
│       ├── utils/               # Frontend-specific utilities
│       └── types/               # Frontend-specific types
│
├── api/                         # Node.js backend (REST API)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Server entry point
│       ├── config/              # Configuration (DB, env vars)
│       ├── routes/              # Express routes
│       ├── controllers/         # Request handlers
│       ├── services/            # Business logic
│       ├── middleware/          # Auth, validation, error handling
│       ├── models/              # Database models (optional)
│       ├── utils/               # Backend-specific utilities
│       └── migrations/          # SQL migration scripts
│
├── shared/                      # Shared TypeScript types & utilities
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Main export file
│       ├── types/               # Shared TypeScript types
│       │   ├── user.types.ts
│       │   ├── scholarship.types.ts
│       │   ├── application.types.ts
│       │   ├── essay.types.ts
│       │   ├── recommendation.types.ts
│       │   ├── collaborator.types.ts
│       │   └── search.types.ts
│       └── utils/               # Shared utilities
│           ├── validation.ts    # Zod schemas
│           ├── constants.ts     # Shared constants
│           └── formatting.ts    # Date, currency formatters
│
├── scripts/                     # Helper scripts
│   ├── setup.sh                 # First-time project setup
│   ├── dev.sh                   # Start all dev servers
│   ├── seed-db.sh               # Seed database with sample data
│   └── backup-db.sh             # Backup database
│
└── docs/                        # Documentation
    ├── architecture.md          # Architecture overview
    ├── database-schema.md       # Database schema reference
    ├── api-spec.md              # API documentation
    └── deployment.md            # Deployment guide
```

---

## Database Schema Overview

### Core Tables (Phase 1)
```sql
-- Users & Auth (Supabase Auth handles most of this)
- users (id, email, created_at, updated_at)
- user_profiles (user_id, first_name, last_name, academic_level, major, gpa, ...)
- user_roles (user_id, role: 'student' | 'recommender' | 'collaborator')

-- Scholarships (MVP: user-specific, each user maintains their own list)
- scholarships (id, user_id, title, description, organization, deadline, min_award, max_award, ...)
  -- NOTE: For MVP, scholarships are user-owned (user_id field)
  -- Future: Can transition to shared/global scholarships for discovery features
- scholarship_subject_areas (scholarship_id, subject_area_id)
- subject_areas (id, name)
- scholarship_geographic_restrictions (scholarship_id, region_name)

-- Applications
- applications (id, user_id, scholarship_name, target_type, organization, status, due_date, ...)
```

### Extended Tables (Phase 2-3)
```sql
-- Essays
- essays (id, application_id, theme, word_count, essay_link, ...)

-- Collaborators (unified polymorphic design)
- collaborators (id, user_id, first_name, last_name, email, relationship, ...)
  -- No collaborator_type field - same person can do multiple collaboration types
- collaborations (id, collaborator_id, application_id, collaboration_type, status, awaiting_action_from, ...)
  -- collaboration_type: 'recommendation' | 'essayReview' | 'guidance'
  -- Base table with common fields + action tracking
- essay_review_collaborations (collaboration_id, essay_id, current_draft_version, feedback_rounds, ...)
  -- Type-specific data for essay reviews
- recommendation_collaborations (collaboration_id, portal_url, questionnaire_completed, ...)
  -- Type-specific data for recommendations
- guidance_collaborations (collaboration_id, session_type, meeting_url, scheduled_for, ...)
  -- Type-specific data for guidance/counseling
- collaboration_history (id, collaboration_id, action, details, ...)
```

---

## Phase-by-Phase Implementation Plan

---

## PHASE 0: Project Setup & Foundation
**Goal**: Create new monorepo, configure workspace, set up Supabase

### TODO 0.1: Initialize Monorepo
- [✅ ] Create new directory: `mkdir scholarship-hub && cd scholarship-hub`
- [ ] Initialize git: `git init`
- [ ] Create root `package.json` with workspaces:
  ```json
  {
    "name": "scholarship-hub",
    "version": "1.0.0",
    "private": true,
    "workspaces": [
      "web",
      "api",
      "shared"
    ],
    "scripts": {
      "dev": "concurrently \"npm run dev -w web\" \"npm run dev -w api\"",
      "dev:web": "npm run dev --workspace=web",
      "dev:api": "npm run dev --workspace=api",
      "build": "npm run build --workspaces --if-present",
      "lint": "npm run lint --workspaces --if-present",
      "type-check": "npm run type-check --workspaces --if-present"
    },
    "devDependencies": {
      "concurrently": "^8.2.2"
    }
  }
  ```
- [ ] Create `.gitignore`:
  ```
  # Dependencies
  node_modules/

  # Build outputs
  dist/
  build/

  # Environment files
  .env
  .env.local
  .env.*.local

  # OS files
  .DS_Store
  Thumbs.db

  # Logs
  *.log
  npm-debug.log*

  # IDE
  .vscode/
  .idea/
  *.swp
  *.swo

  # Python
  __pycache__/
  *.py[cod]
  venv/
  .pytest_cache/
  ```
- [ ] Create directory structure:
  ```bash
  mkdir -p web/src/{assets,components,hooks,pages,services,contexts,utils,types}
  mkdir -p api/src/{config,routes,controllers,services,middleware,models,utils,migrations}
  mkdir -p shared/src/{types,utils}
  mkdir -p scripts
  mkdir -p docs
  ```
- [ ] Install root-level dev dependency:
  ```bash
  npm install -D concurrently
  ```

### TODO 0.2: Set Up Shared Package
- [ ✅] Create `shared/package.json`:
  ```json
  {
    "name": "@scholarship-hub/shared",
    "version": "1.0.0",
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "dev": "tsc --watch",
      "type-check": "tsc --noEmit"
    },
    "devDependencies": {
      "typescript": "^5.3.3"
    },
    "dependencies": {
      "zod": "^3.22.4"
    }
  }
  ```
- [✅ ] Create `shared/tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ESNext",
      "lib": ["ES2020"],
      "declaration": true,
      "declarationMap": true,
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "moduleResolution": "node"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  }
  ```
- [✅ ] Copy type files from `/Users/teial/Tutorials/scholarship-types/` to `shared/src/types/`:
  ```bash
  cp /Users/teial/Tutorials/scholarship-types/*.types.ts shared/src/types/
  ```
- [ ✅] Create `shared/src/index.ts` to export all types and utils:
  ```typescript
  // Export all types
  export * from './types/user.types';
  export * from './types/scholarship.types';
  export * from './types/application.types';
  export * from './types/essay.types';
  export * from './types/recommendation.types';
  export * from './types/collaborator.types';
  export * from './types/search.types';

  // Export all utils
  export * from './utils/validation';
  export * from './utils/constants';
  export * from './utils/formatting';
  ```
- [✅ ] Create placeholder utility files:
  - `shared/src/utils/validation.ts` (Zod schemas for validation)
  - `shared/src/utils/constants.ts` (Shared constants, enums)
  - `shared/src/utils/formatting.ts` (Date/currency formatters)
- [✅ ] Build shared package:
  ```bash
  cd shared
  npm install
  npm run build
  cd ..
  ```
- [ ✅] Verify build output in `shared/dist/`

### TODO 0.3: Set Up Supabase Project
- [✅ ] Go to https://supabase.com and create new project
- [✅ ] Note down:
  - Project URL
  - Anon key
  - Service role key (keep secret!)
- [ ✅] Create `.env.example` at root:
  ```
  # Supabase
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

  # Backend
  PORT=3001
  NODE_ENV=development

  # Frontend
  VITE_API_URL=http://localhost:3001
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```
- [✅ ] Copy to `.env.local` and fill in real values
- [✅ ] Add `.env.local` to `.gitignore`

### TODO 0.4: Documentation Setup
- [✅ ] Create root `README.md`:
  ```markdown
  # ScholarshipHub

  A comprehensive scholarship tracking and management system.

  ## Project Structure

  - `web/` - React frontend (Vite + TypeScript)
  - `api/` - Node.js backend (Express + Supabase)
  - `shared/` - Shared TypeScript types and utilities
  - `scripts/` - Helper scripts
  - `docs/` - Documentation

  ## Quick Start

  1. **First-time setup:**
     ```bash
     ./scripts/setup.sh
     ```

  2. **Configure environment:**
     - Edit `.env.local` with your Supabase credentials

  3. **Start development servers:**
     ```bash
     npm run dev
     ```
     - Frontend: http://localhost:5173
     - Backend: http://localhost:3001

  ## Development

  - `npm run dev` - Start web + api dev servers
  - `npm run dev:web` - Start frontend only
  - `npm run dev:api` - Start backend only
  - `npm run build` - Build all packages
  - `npm run lint` - Lint all packages

  ## Documentation

  - [Architecture](docs/architecture.md)
  - [Database Schema](docs/database-schema.md)
  - [API Specification](docs/api-spec.md)
  - [Deployment Guide](docs/deployment.md)
  ```
- [ ] Create `docs/architecture.md` with system architecture diagram
- [ ] Create `docs/database-schema.md` for schema reference
- [ ] Create `docs/api-spec.md` for API documentation
- [ ] Create `docs/deployment.md` for deployment instructions

### TODO 0.5: Create Helper Scripts
- [✅ ] Create `scripts/setup.sh`:
  ```bash
  #!/bin/bash
  # First-time project setup script

  echo "🚀 Setting up ScholarshipHub..."

  # Check if .env.local exists
  if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your actual credentials"
  fi

  # Install all dependencies
  echo "📦 Installing dependencies..."
  npm install

  # Build shared package
  echo "🔨 Building shared package..."
  npm run build --workspace=shared

  echo "✅ Setup complete!"
  echo "Next steps:"
  echo "  1. Edit .env.local with your Supabase credentials"
  echo "  2. Run 'npm run dev' to start development servers"
  ```
- [ ✅] Create `scripts/dev.sh`:
  ```bash
  #!/bin/bash
  # Start all development servers

  echo "🚀 Starting development servers..."

  # Check if shared package is built
  if [ ! -d "shared/dist" ]; then
    echo "🔨 Building shared package first..."
    npm run build --workspace=shared
  fi

  # Start web and api concurrently
  npm run dev
  ```
- [ ✅] Create `scripts/seed-db.sh`:
  ```bash
  #!/bin/bash
  # Seed database with sample data

  echo "🌱 Seeding database with sample data..."

  # This will be implemented later when we have the API
  # For now, it's a placeholder

  echo "TODO: Implement database seeding"
  echo "This will populate:"
  echo "  - Sample scholarships"
  echo "  - Sample subject areas"
  echo "  - Test user accounts"
  ```
- [✅ ] Create `scripts/backup-db.sh`:
  ```bash
  #!/bin/bash
  # Backup Supabase database

  echo "💾 Backing up database..."

  # Supabase provides automatic backups, but this script
  # can be used for manual backups if needed

  echo "TODO: Implement database backup"
  echo "For now, use Supabase dashboard for backups:"
  echo "https://supabase.com/dashboard/project/_/settings/storage"
  ```
- [ ✅] Make all scripts executable:
  ```bash
  chmod +x scripts/*.sh
  ```
- [✅ ] Test setup script:
  ```bash
  ./scripts/setup.sh
  ```

**Milestone**:
- ✅ Monorepo initialized with NPM workspaces (`web/`, `api/`, `shared/`)
- ✅ Supabase project created and configured
- ✅ Shared package built and importable by web/api
- ✅ Helper scripts created for common tasks
- ✅ Development environment ready

---

## PHASE 1: Database Schema & Migrations
**Goal**: Design and implement core database schema in Supabase

### TODO 1.1: Plan Database Schema
- [✅] Review ChatGPT's schema suggestions
- [ ✅] Map your existing types to PostgreSQL tables
- [✅] Decide on naming conventions (snake_case for DB, camelCase for TypeScript)
- [ ] Document schema in `docs/database-schema.md`

### TODO 1.2: Create Migration 001 - Core User Tables
- [✅] In Supabase SQL Editor, create migration script `001_core_users.sql`:
  ```sql
  -- users table (extends Supabase auth.users)
  CREATE TABLE public.user_profiles (
    user_id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email_address TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- user_roles table
  CREATE TYPE user_role AS ENUM ('student', 'recommender', 'collaborator');

  CREATE TABLE public.user_roles (
    user_id BIGINT REFERENCES public.user_profiles(user_id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
  );


  -- User search preferences table - normalized representation of nested User.searchPreferences
  CREATE TABLE public.user_search_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    target_type TEXT,
    subject_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
    gender TEXT,
    ethnicity TEXT,
    min_award NUMERIC(10,2),
    geographic_restrictions TEXT,
    essay_required BOOLEAN,
    recommendation_required BOOLEAN,
    academic_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Enable Row Level Security
  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

  -- RLS Policies
  CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
  ```
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify tables created in Table Editor

### TODO 1.3: Create Migration 002 - Applications
- [✅] Create `002_applications.sql`:
  ```sql
  -- Application status enum
  CREATE TYPE application_status AS ENUM (
    'Not Started',
    'In Progress',
    'Submitted',
    'Awarded',
    'Not Awarded'
  );

  -- Target type enum
  CREATE TYPE target_type AS ENUM (
    'Merit',
    'Need',
    'Both'
  );

  -- Applications table
  CREATE TABLE public.applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,

    -- Scholarship details
    scholarship_name TEXT NOT NULL,
    target_type target_type,
    organization TEXT,
    org_website TEXT,
    platform TEXT,
    application_link TEXT,
    theme TEXT,
    min_award NUMERIC(10,2),
    max_award NUMERIC(10,2),
    requirements TEXT,
    renewable BOOLEAN DEFAULT FALSE,
    renewable_terms TEXT,
    document_info_link TEXT,

    -- Application tracking
    current_action TEXT,
    status application_status DEFAULT 'Not Started',
    submission_date DATE,
    open_date DATE,
    due_date DATE NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes for performance
  CREATE INDEX idx_applications_user_id ON public.applications(user_id);
  CREATE INDEX idx_applications_status ON public.applications(status);
  CREATE INDEX idx_applications_due_date ON public.applications(due_date);

  -- Enable Row Level Security
  ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

  -- RLS Policies
  CREATE POLICY "Users can view own applications" ON public.applications
    FOR SELECT USING (
      user_id IN (
        SELECT id FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert own applications" ON public.applications
    FOR INSERT WITH CHECK (
      user_id IN (
        SELECT id FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update own applications" ON public.applications
    FOR UPDATE USING (
      user_id IN (
        SELECT id FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete own applications" ON public.applications
    FOR DELETE USING (
      user_id IN (
        SELECT id FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
      )
    );

  -- Trigger to automatically update updated_at timestamp
  CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- Comments for documentation
  COMMENT ON TABLE public.applications IS 'Scholarship applications tracked by students';
  COMMENT ON COLUMN public.applications.user_id IS 'The student who owns this application';
  COMMENT ON COLUMN public.applications.target_type IS 'Whether scholarship is merit-based, need-based, or both';
  ```
- [ ] Run migration

### TODO 1.4: Create Migration 003 - Essays
- [✅] Create `003_essays.sql`:
  ```sql
  CREATE TABLE public.essays (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    theme TEXT,
    units TEXT, -- 'words' | 'characters'
    essay_link TEXT, -- URL to Google Docs or storage
    word_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_essays_application ON public.essays(id);

  -- RLS (users can manage essays for their own applications)
  ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view essays for own applications" ON public.essays
    FOR SELECT USING (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert essays for own applications" ON public.essays
    FOR INSERT WITH CHECK (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update essays for own applications" ON public.essays
    FOR UPDATE USING (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete essays for own applications" ON public.essays
    FOR DELETE USING (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );
  ```
- [✅] Run migration

### TODO 1.5: Create Migration 004 - Collaborators (Polymorphic Design)
- [✅] Create `004_collaborators.sql`:
  ```sql
  -- Collaboration types: what kind of help they're providing
  CREATE TYPE collaboration_type AS ENUM (
    'recommendation',
    'essayReview',
    'guidance'
  );

  -- Collaboration status
  CREATE TYPE collaboration_status AS ENUM (
    'pending',
    'invited',
    'in_progress',
    'submitted',
    'completed',
    'declined'
  );

  -- Action ownership: who needs to act next
  CREATE TYPE action_owner AS ENUM (
    'student',
    'collaborator'
  );

  -- Session types for guidance collaborations
  CREATE TYPE session_type AS ENUM (
    'initial',
    'followup',
    'final'
  );

  -- Collaborators table (people who help students - owned by user)
  -- NOTE: No collaborator_type field - same person can do multiple collaboration types
  CREATE TABLE public.collaborators (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL, -- Student who owns this collaborator
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    relationship TEXT, -- e.g., 'Teacher', 'Counselor', 'Tutor', 'Parent'
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Base collaborations table (common fields for all types)
  CREATE TABLE public.collaborations (
    id BIGSERIAL PRIMARY KEY,
    collaborator_id BIGINT REFERENCES public.collaborators(id) ON DELETE CASCADE NOT NULL,
    application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    collaboration_type collaboration_type NOT NULL,
    status collaboration_status DEFAULT 'pending',

    -- Action tracking: who needs to act next
    awaiting_action_from action_owner,
    awaiting_action_type TEXT,
    next_action_description TEXT,
    next_action_due_date DATE,

    notes TEXT, -- Additional context or instructions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- A collaborator can only have one collaboration of each type per application
    UNIQUE(collaborator_id, application_id, collaboration_type)
  );

  -- Essay review-specific table (one collaboration can review multiple essays)
  CREATE TABLE public.essay_review_collaborations (
    id BIGSERIAL PRIMARY KEY,
    collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
    essay_id BIGINT REFERENCES public.essays(id) ON DELETE CASCADE NOT NULL,

    -- Essay review tracking
    current_draft_version INT DEFAULT 0,
    feedback_rounds INT DEFAULT 0,
    last_feedback_at TIMESTAMPTZ,

    UNIQUE(collaboration_id, essay_id)
  );

  -- Recommendation-specific table (one-to-one with collaboration)
  CREATE TABLE public.recommendation_collaborations (
    id BIGSERIAL PRIMARY KEY,
    collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL UNIQUE,

    -- Recommendation tracking
    portal_url TEXT,
    portal_deadline DATE,
    questionnaire_completed BOOLEAN DEFAULT FALSE,
    letter_submitted_at TIMESTAMPTZ
  );

  -- Guidance/counseling-specific table (one-to-one with collaboration)
  CREATE TABLE public.guidance_collaborations (
    id BIGSERIAL PRIMARY KEY,
    collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL UNIQUE,

    -- Guidance tracking
    session_type session_type,
    meeting_url TEXT,
    scheduled_for TIMESTAMPTZ
  );

  -- Collaboration history - tracks all actions
  CREATE TABLE public.collaboration_history (
    id BIGSERIAL PRIMARY KEY,
    collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- 'invited', 'reminder_sent', 'viewed', 'uploaded', 'comment_added', etc.
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes for performance
  CREATE INDEX idx_collaborations_collaborator ON public.collaborations(collaborator_id);
  CREATE INDEX idx_collaborations_application ON public.collaborations(application_id);
  CREATE INDEX idx_collaborations_type ON public.collaborations(collaboration_type);
  CREATE INDEX idx_collaborations_status ON public.collaborations(status);
  CREATE INDEX idx_collaborations_action_owner ON public.collaborations(awaiting_action_from);
  CREATE INDEX idx_essay_review_essay ON public.essay_review_collaborations(essay_id);

  -- Enable Row Level Security
  ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.essay_review_collaborations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.recommendation_collaborations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.guidance_collaborations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.collaboration_history ENABLE ROW LEVEL SECURITY;

  -- RLS Policies: Students can view their own collaborators
  CREATE POLICY "Users can view own collaborators" ON public.collaborators
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.id = collaborators.user_id
        AND p.auth_user_id = auth.uid()
      )
    );

  -- RLS Policies: Students can insert their own collaborators
  CREATE POLICY "Users can insert own collaborators" ON public.collaborators
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.id = user_id
        AND p.auth_user_id = auth.uid()
      )
    );

  -- RLS Policies: Students can update their own collaborators
  CREATE POLICY "Users can update own collaborators" ON public.collaborators
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.user_profiles p
        WHERE p.id = collaborators.user_id
        AND p.auth_user_id = auth.uid()
      )
    );

  -- RLS Policies: Students can view their collaborations
  CREATE POLICY "Users can view own collaborations" ON public.collaborations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.collaborators c
        JOIN public.user_profiles p ON p.id = c.user_id
        WHERE c.id = collaborations.collaborator_id
        AND p.auth_user_id = auth.uid()
      )
    );

  -- RLS Policies for type-specific tables (inherit from base collaborations)
  CREATE POLICY "Users can view own essay reviews" ON public.essay_review_collaborations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.collaborations c
        JOIN public.collaborators co ON co.id = c.collaborator_id
        JOIN public.user_profiles p ON p.id = co.user_id
        WHERE c.id = essay_review_collaborations.collaboration_id
        AND p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can view own recommendations" ON public.recommendation_collaborations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.collaborations c
        JOIN public.collaborators co ON co.id = c.collaborator_id
        JOIN public.user_profiles p ON p.id = co.user_id
        WHERE c.id = recommendation_collaborations.collaboration_id
        AND p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can view own guidance sessions" ON public.guidance_collaborations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.collaborations c
        JOIN public.collaborators co ON co.id = c.collaborator_id
        JOIN public.user_profiles p ON p.id = co.user_id
        WHERE c.id = guidance_collaborations.collaboration_id
        AND p.auth_user_id = auth.uid()
      )
    );

  -- Policies for collaboration_history
  CREATE POLICY "Users can view own collaboration history" ON public.collaboration_history
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.collaborations c
        JOIN public.collaborators co ON co.id = c.collaborator_id
        JOIN public.user_profiles p ON p.id = co.user_id
        WHERE c.id = collaboration_history.collaboration_id
        AND p.auth_user_id = auth.uid()
      )
    );
  ```
- [✅] Run migration
- [ ] Test with sample data:
  - Add a recommender and create recommendation collaboration with portal URL
  - Add an essay editor and create essay review collaboration linked to an essay
  - Add a counselor and create guidance collaboration with scheduled session
  - Test action tracking by updating `awaiting_action_from` field


### TODO 1.6: Create Migration 005 - Recommendations
- [✅] Create `005_recommendations.sql`:
  ```sql
  -- Recommendation status enum
  CREATE TYPE recommendation_status AS ENUM (
    'Pending',
    'Submitted'
  );

  -- Recommendations table
  CREATE TABLE public.recommendations (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
    recommender_id BIGINT REFERENCES public.collaborators(id) ON DELETE CASCADE NOT NULL,

    -- Recommendation tracking
    status recommendation_status DEFAULT 'Pending',
    submitted_at TIMESTAMPTZ,
    due_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- A recommender can only have one recommendation per application
    UNIQUE(application_id, recommender_id)
  );

  -- Indexes for performance
  CREATE INDEX idx_recommendations_application_id ON public.recommendations(application_id);
  CREATE INDEX idx_recommendations_recommender_id ON public.recommendations(recommender_id);
  CREATE INDEX idx_recommendations_status ON public.recommendations(status);

  -- Enable Row Level Security
  ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

  -- RLS Policies
  CREATE POLICY "Users can view recommendations for own applications" ON public.recommendations
    FOR SELECT USING (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert recommendations for own applications" ON public.recommendations
    FOR INSERT WITH CHECK (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update recommendations for own applications" ON public.recommendations
    FOR UPDATE USING (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete recommendations for own applications" ON public.recommendations
    FOR DELETE USING (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.user_profiles p ON p.id = a.user_id
        WHERE p.auth_user_id = auth.uid()
      )
    );

  -- Trigger to automatically update updated_at timestamp
  CREATE TRIGGER update_recommendations_updated_at
    BEFORE UPDATE ON public.recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- Comments for documentation
  COMMENT ON TABLE public.recommendations IS 'Recommendation letters for scholarship applications';
  COMMENT ON COLUMN public.recommendations.recommender_id IS 'The collaborator writing the recommendation';
  ```
- [ ] Run migration

### TODO 1.7: Set Up Migration Workflow
- [ ] Document all migrations in `docs/database-schema.md`
- [ ] Create backup/restore procedures
- [ ] Test schema with sample data

**Milestone**: Database schema complete and documented

---

## PHASE 2: Backend Foundation
**Goal**: Set up Node.js backend with Supabase integration, basic API endpoints

### TODO 2.1: Initialize Backend Package
- [ ] `cd api && npm init -y`
- [ ] Update `package.json`:
  ```json
  {
    "name": "@scholarship-hub/api",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "tsx watch src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js",
      "lint": "eslint src/**/*.ts",
      "type-check": "tsc --noEmit"
    },
    "dependencies": {
      "@scholarship-hub/shared": "*",
      "@supabase/supabase-js": "^2.x",
      "express": "^4.18.2",
      "cors": "^2.8.5",
      "helmet": "^7.1.0",
      "morgan": "^1.10.0",
      "dotenv": "^16.3.1",
      "zod": "^3.22.0"
    },
    "devDependencies": {
      "@types/express": "^4.17.21",
      "@types/cors": "^2.8.17",
      "@types/morgan": "^1.9.9",
      "@types/node": "^20.10.0",
      "typescript": "^5.3.3",
      "tsx": "^4.7.0",
      "eslint": "^8.56.0"
    }
  }
  ```
- [ ] Install dependencies: `npm install`
- [ ] Create `tsconfig.json`
- [ ] Directory structure already created in Phase 0

### TODO 2.2: Create Basic Server Structure
- [ ] Create `src/index.ts`:
  ```typescript
  import express from 'express';
  import cors from 'cors';
  import helmet from 'helmet';
  import morgan from 'morgan';
  import { config } from './config/index.js';

  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
  });
  ```
- [ ] Create `src/config/index.ts` to load environment variables
- [ ] Test: `npm run dev` should start server at http://localhost:3001
- [ ] Test: `curl http://localhost:3001/health` should return `{"status":"ok"}`

### TODO 2.3: Set Up Supabase Client
- [ ] Create `src/config/supabase.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  import { config } from './index.js';

  export const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey // Use service role key for server
  );
  ```
- [ ] Create helper utilities in `src/utils/supabase.ts` for common DB operations
- [ ] Test connection: write a simple script to fetch from `user_profiles` table

### TODO 2.4: Create Middleware
- [ ] Create `src/middleware/auth.ts`:
  ```typescript
  // Middleware to verify Supabase JWT token
  // Extract user from token and attach to req.user
  ```
- [ ] Create `src/middleware/error-handler.ts` for centralized error handling
- [ ] Create `src/middleware/validate.ts` using Zod for request validation

### TODO 2.5: Implement Users API
- [ ] Create `src/routes/users.routes.ts`
- [ ] Create `src/controllers/users.controller.ts`
- [ ] Create `src/services/users.service.ts`
- [ ] Implement endpoints:
  - `GET /api/users/me` - Get current user profile
  - `PATCH /api/users/me` - Update current user profile
  - `GET /api/users/me/roles` - Get user roles
- [ ] Test with curl or Postman

### TODO 2.6: Implement Scholarships API (Read-Only)
- [ ] Create `src/routes/scholarships.routes.ts`
- [ ] Create `src/controllers/scholarships.controller.ts`
- [ ] Create `src/services/scholarships.service.ts`
- [ ] Implement endpoints:
  - `GET /api/scholarships` - List scholarships (with pagination)
  - `GET /api/scholarships/:id` - Get scholarship details
- [ ] Test with sample data

### TODO 2.7: Implement Applications API
- [ ] Create full CRUD for applications:
  - `GET /api/applications` - List user's applications
  - `POST /api/applications` - Create new application
  - `GET /api/applications/:id` - Get application details
  - `PATCH /api/applications/:id` - Update application
  - `DELETE /api/applications/:id` - Delete application
- [ ] Ensure RLS policies are enforced
- [ ] Test all endpoints

**Milestone**: Backend can serve user profiles, scholarships, and applications via REST API

---

## PHASE 3: Authentication Setup
**Goal**: Implement Supabase Auth for email/password authentication

### TODO 3.1: Configure Supabase Auth
- [ ] In Supabase dashboard → Authentication → Settings:
  - Enable email/password auth
  - Configure email templates (welcome, reset password, etc.)
  - Set site URL and redirect URLs
- [ ] Test email delivery (use your email)

### TODO 3.2: Backend Auth Endpoints
- [ ] Create `src/routes/auth.routes.ts`
- [ ] Create `src/controllers/auth.controller.ts`
- [ ] Implement:
  - `POST /api/auth/register` - Register new user
    - Create user in Supabase Auth
    - Create user_profile record
    - Create user_role record (default: 'student')
  - `POST /api/auth/login` - Login (handled by Supabase client, but you might proxy)
  - `POST /api/auth/logout` - Logout
  - `POST /api/auth/refresh` - Refresh session
- [ ] Test registration and login flow

### TODO 3.3: Protect Routes with Auth Middleware
- [ ] Apply `auth` middleware to protected routes
- [ ] Test that unauthenticated requests return 401
- [ ] Test that authenticated requests work

### TODO 3.4: Role-Based Access Control (RBAC)
- [ ] Create `src/middleware/role.ts`:
  ```typescript
  // Middleware to check if user has required role
  export const requireRole = (roles: UserRole[]) => { ... }
  ```
- [ ] Apply to routes that need role restrictions
- [ ] Test student vs recommender access

**Milestone**: Full authentication working, routes protected

---

## PHASE 4: Frontend Foundation
**Goal**: Set up React SPA with Vite, connect to backend

### TODO 4.1: Initialize Frontend Package
- [ ] `cd web`
- [ ] `npm create vite@latest . -- --template react-ts`
- [ ] Update `package.json`:
  ```json
  {
    "name": "@scholarship-hub/web",
    "dependencies": {
      "@scholarship-hub/shared": "*",
      "@supabase/supabase-js": "^2.x",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.20.0",
      "axios": "^1.6.2"
    },
    "devDependencies": {
      "@types/react": "^18.2.43",
      "@types/react-dom": "^18.2.17",
      "@vitejs/plugin-react": "^4.2.1",
      "typescript": "^5.3.3",
      "vite": "^5.0.8"
    }
  }
  ```
- [ ] Install dependencies: `npm install`
- [ ] Configure Vite to proxy API requests: update `vite.config.ts`
- [ ] Directory structure already created in Phase 0

### TODO 4.2: Set Up Routing
- [ ] Install `react-router-dom`:
  ```bash
  cd web
  npm install react-router-dom
  ```
- [ ] Create `web/src/pages/` structure:
  ```bash
  touch src/pages/Login.tsx
  touch src/pages/Register.tsx
  touch src/pages/Dashboard.tsx
  touch src/pages/Applications.tsx
  touch src/pages/ScholarshipSearch.tsx
  ```
- [ ] Create basic route structure in `web/src/App.tsx`:
  ```typescript
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  import Login from './pages/Login';
  import Register from './pages/Register';
  import Dashboard from './pages/Dashboard';
  import Applications from './pages/Applications';
  import ScholarshipSearch from './pages/ScholarshipSearch';

  function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/scholarships/search" element={<ScholarshipSearch />} />
        </Routes>
      </BrowserRouter>
    );
  }
  ```
- [ ] Test navigation between routes

### TODO 4.3: Create Auth Context
- [ ] Create `web/src/config/supabase.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```
- [ ] Create `web/src/contexts/AuthContext.tsx`:
  ```typescript
  import { createContext, useContext, useEffect, useState } from 'react';
  import { User } from '@supabase/supabase-js';
  import { supabase } from '../config/supabase';

  interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // TODO: Implement auth methods

    return (
      <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
  }
  ```
- [ ] Wrap app with AuthProvider in `web/src/main.tsx`

### TODO 4.4: Build Login & Registration Pages
- [ ] Create `src/pages/Login.tsx`:
  - Email/password form
  - Call Supabase auth
  - Redirect to /dashboard on success
- [ ] Create `src/pages/Register.tsx`:
  - Email/password/name form
  - Call backend `/api/auth/register`
  - Redirect to /dashboard on success
- [ ] Style with basic CSS or a UI library (optional: shadcn/ui, Tailwind)

### TODO 4.5: Build Protected Route Component
- [ ] Create `src/components/ProtectedRoute.tsx`:
  ```typescript
  // Check if user is authenticated
  // If not, redirect to /login
  ```
- [ ] Apply to dashboard and other protected routes
- [ ] Test: unauthenticated access should redirect to login

### TODO 4.6: Build Student Dashboard (Basic)
- [ ] Create `src/pages/Dashboard.tsx`
- [ ] Fetch user profile from `/api/users/me`
- [ ] Display welcome message: "Welcome, [firstName]!"
- [ ] Show list of applications (fetch from `/api/applications`)
- [ ] Add "New Application" button (goes to form, implement in Phase 5)

**Milestone**: Frontend can register, login, view dashboard with basic data

---

## PHASE 5: Application & Essay Management
**Goal**: Full CRUD UI for applications and essays

### TODO 5.1: Build Application List Page
- [ ] Create `src/pages/Applications.tsx`
- [ ] Fetch and display all applications in a table/grid
- [ ] Show: scholarship name, status, due date, actions (edit, delete)
- [ ] Add pagination if needed
- [ ] Add search/filter by status

### TODO 5.2: Build Application Form (Create/Edit)
- [ ] Create `src/components/ApplicationForm.tsx`
- [ ] Fields: scholarship name, organization, deadline, status, etc.
- [ ] Support both creating new and editing existing
- [ ] Validation using Zod or similar
- [ ] Submit to backend API
- [ ] Show success/error messages

### TODO 5.3: Build Application Detail Page
- [ ] Create `src/pages/ApplicationDetail.tsx`
- [ ] Show full application info
- [ ] List associated essays
- [ ] List associated recommendations
- [ ] Actions: Edit application, Add essay, Add recommender

### TODO 5.4: Build Essay Management
- [ ] Create `src/components/EssayForm.tsx`
- [ ] Fields: theme, word count, essay link (Google Docs URL)
- [ ] Backend endpoints for essays:
  - `GET /api/applications/:id/essays`
  - `POST /api/applications/:id/essays`
  - `PATCH /api/essays/:id`
  - `DELETE /api/essays/:id`
- [ ] Integrate into ApplicationDetail page
- [ ] Test creating, editing, deleting essays

### TODO 5.5: Add "Quick Add from Scholarship" Flow
- [ ] From scholarship search results, add "Apply" button
- [ ] Auto-populate application form with scholarship data
- [ ] Save to applications table

**Milestone**: Students can fully manage applications and essays

---

## PHASE 6: Scholarship Management & Filtering
**Goal**: Allow users to manually add scholarships and search/filter their own list

### TODO 6.1: Backend - Scholarship CRUD
- [ ] Create routes/controllers/services for:
  - `POST /api/scholarships` - Add a new scholarship (manually entered by user)
  - `GET /api/scholarships` - List all scholarships for the user
  - `GET /api/scholarships/:id` - Get specific scholarship
  - `PATCH /api/scholarships/:id` - Update scholarship details
  - `DELETE /api/scholarships/:id` - Delete scholarship
- [ ] Note: For MVP, scholarships are user-specific (each user maintains their own list)
- [ ] Each scholarship should include:
  - Basic info: title, organization, url
  - Financial: min_award, max_award
  - Deadline: deadline date
  - Eligibility: academic_level, major, min_gpa, etc.
  - Optional: description, requirements, notes

### TODO 6.2: Backend - Search/Filter Service
- [ ] Create `src/services/scholarships.filter.service.ts`
- [ ] Implement filtering for user's scholarships:
  ```typescript
  interface FilterCriteria {
    keyword?: string; // Search in title, organization, description
    minAward?: number;
    maxAward?: number;
    deadlineAfter?: string;
    deadlineBefore?: string;
    academicLevel?: string;
    major?: string;
    sortBy?: 'deadline' | 'award' | 'title' | 'created';
    sortOrder?: 'asc' | 'desc';
  }
  ```
- [ ] Use PostgreSQL full-text search with `to_tsvector` on title/organization/description
- [ ] Return filtered and sorted results

### TODO 6.3: Backend - Filter Endpoint
- [ ] Create `GET /api/scholarships?keyword=...&minAward=...` (query params for filtering)
- [ ] Or `POST /api/scholarships/filter` with `FilterCriteria` in body
- [ ] Return user's scholarships matching criteria
- [ ] Support pagination

### TODO 6.4: Frontend - Add Scholarship Page
- [ ] Create `src/pages/AddScholarship.tsx`
- [ ] Build form for manual scholarship entry:
  - **Quick Entry**: Name, organization, deadline, award amount, URL
  - "Add Details Later" vs "Full Details" toggle
  - **Full Entry**: All eligibility criteria, requirements, description
- [ ] Submit to `POST /api/scholarships`
- [ ] Redirect to scholarships list or "Create Application" flow
- [ ] Make the form fast and easy to use

### TODO 6.5: Frontend - Scholarships List Page
- [ ] Create `src/pages/Scholarships.tsx`
- [ ] Display user's scholarships in cards/table
- [ ] Each entry shows: title, organization, deadline, award amount
- [ ] Actions for each scholarship:
  - "Create Application" → go to new application flow
  - "Edit" → edit scholarship details
  - "Delete" → remove scholarship
- [ ] Show scholarships with upcoming deadlines prominently

### TODO 6.6: Frontend - Search/Filter UI
- [ ] Add search bar at top of scholarships list
- [ ] Add filter controls:
  - Keyword search (searches title, org, description)
  - Award range (min/max sliders or inputs)
  - Deadline range (date pickers)
  - Academic level dropdown
  - Major dropdown
- [ ] Add sort options:
  - By deadline (soonest first)
  - By award amount (highest first)
  - By title (A-Z)
  - By date added (newest first)
- [ ] Apply filters client-side if list is small, or call backend filter endpoint
- [ ] Update URL query params to make filters shareable/bookmarkable

### TODO 6.7: Optional - Saved Filters (Can Defer)
- [ ] Backend:
  - `POST /api/saved-filters` - Save filter criteria
  - `GET /api/saved-filters` - List user's saved filters
  - `DELETE /api/saved-filters/:id` - Delete saved filter
- [ ] Frontend:
  - "Save Filter" button on scholarships page
  - Sidebar or dropdown showing saved filters
  - Click to apply saved filter

**Milestone**: Users can easily add, manage, search, and filter their scholarship list

**Note**: External scholarship discovery (browse, web search, scraper) has been deferred. See `SCHOLARSHIP_DISCOVERY_PHASE.md` for future enhancement options.

---

## PHASE 7: Collaborators (Unified)
**Goal**: Students can add collaborators (recommenders, essay editors, counselors), send invites, track status

### TODO 7.1: Backend - Collaborators CRUD
- [ ] Create routes/controllers/services for:
  - `POST /api/collaborators` - Student adds a collaborator
  - `GET /api/collaborators/:id` - Get specific collaborator
  - `PATCH /api/collaborators/:id` - Update collaborator info
  - `DELETE /api/collaborators/:id` - Remove collaborator

### TODO 7.2: Backend - Collaborations Management
- [ ] Create routes/controllers/services for:
  - `POST /api/collaborations` - Create a collaboration (link collaborator to application/essay)
    - Required: `collaboratorId`, `applicationId`, `collaborationType`
    - Optional: `essayId` (required for essayReview type)
  - `GET /api/applications/:id/collaborations` - List all collaborations for an application
  - `GET /api/essays/:id/collaborations` - List collaborators for a specific essay
  - `GET /api/collaborations/:id` - Get collaboration details
  - `PATCH /api/collaborations/:id` - Update status, notes
  - `POST /api/collaborations/:id/history` - Log action to history
  - `DELETE /api/collaborations/:id` - Remove collaboration

### TODO 7.3: Backend - Email Invitations
- [ ] Set up email service (Supabase has built-in, or use SendGrid/Resend)
- [ ] Create `POST /api/collaborations/:id/invite` endpoint:
  - Generate secure invite token
  - Send email with personalized message based on `collaborationType`:
    - 'recommendation' → "You've been asked to write a recommendation letter"
    - 'essayReview' → "You've been invited to review an essay"
    - 'guidance' → "You've been invited to provide guidance"
  - Link format: `https://app.com/collaborate/invite/:token`
- [ ] Store invite token in DB with expiry (e.g., 7 days)

### TODO 7.4: Frontend - Collaborator Management
- [ ] Create `web/src/pages/Collaborators.tsx`:
  - Tabbed view: Recommenders | Essay Editors | Counselors
  - List all collaborators grouped by type
  - Add collaborator button (opens form with type selector)
- [ ] Create `web/src/components/CollaboratorForm.tsx`:
  - Fields: firstName, lastName, email, relationship, phone
  - Validation: email required, type required
- [ ] Create `web/src/components/AssignCollaboratorModal.tsx`:
  - Assign existing collaborator to application or essay
  - Select collaboration type (recommendation, essayReview, guidance)
  - Set due date and add notes

### TODO 7.5: Frontend - Student View of Collaborations
- [ ] On `ApplicationDetail` page:
  - Section: "Recommendations" - show all recommendation collaborations
  - Section: "Essay Reviews" - show all essay review collaborations
  - Each shows: collaborator name, status, due date, actions (remind, view history)
- [ ] On Essay detail view:
  - List collaborators assigned to this essay
  - "Add Reviewer" button

### TODO 7.6: Frontend - Collaborator Dashboard
- [ ] Create `web/src/pages/CollaboratorDashboard.tsx`:
  - Shows all collaborations assigned to the logged-in collaborator
  - Grouped by type: Recommendations | Essay Reviews | Guidance
  - Each shows: student name, application/essay, due date, status
  - Actions:
    - Mark as "in progress"
    - Mark as "completed" or "submitted"
    - Add notes/feedback
    - View full details

### TODO 7.7: Frontend - Invite Flow
- [ ] Create `web/src/pages/CollaboratorInvite.tsx`:
  - Collaborator receives email → clicks link → lands here
  - Show invitation details (student, type of help needed, due date)
  - Options:
    - Create account (if new user)
    - Log in (if existing user)
    - Accept or Decline
- [ ] After acceptance:
  - Redirect to CollaboratorDashboard
  - Show the specific collaboration they accepted

### TODO 7.8: Collaboration History
- [ ] Log all actions: invited, reminder_sent, viewed, accepted, declined, in_progress, submitted, comment_added
- [ ] Display history timeline on:
  - ApplicationDetail page (for students)
  - CollaboratorDashboard (for collaborators)
- [ ] Show: action, timestamp, details (if any)

**Milestone**: Full unified collaborator system - students can add any type of collaborator, assign them to applications/essays, and collaborators can manage their work

---

## PHASE 8: Polish, Testing & Deployment
**Goal**: Final touches, testing, deploy to production

### TODO 8.1: Error Handling & Validation
- [ ] Review all API endpoints for proper error handling
- [ ] Add input validation with Zod schemas
- [ ] Return consistent error responses
- [ ] Add error boundary to frontend

### TODO 8.2: Loading States & UX
- [ ] Add loading spinners/skeletons to all async operations
- [ ] Add success/error toast notifications
- [ ] Improve form UX (disable submit during request, etc.)

### TODO 8.3: Testing
- [ ] Backend:
  - Write integration tests for key endpoints (use Jest/Vitest)
  - Test auth flows
  - Test CRUD operations
- [ ] Frontend:
  - Write component tests (use Vitest + React Testing Library)
  - Test auth flows
  - Test forms
- [ ] End-to-end:
  - Use Playwright or Cypress for critical user flows

### TODO 8.4: Documentation
- [ ] Complete `README.md` with:
  - Architecture overview
  - Setup instructions
  - Development workflow
  - Deployment guide
- [ ] API documentation (use Swagger/OpenAPI if desired)
- [ ] Update `docs/` with:
  - Database schema diagram
  - API reference
  - User guides

### TODO 8.5: Performance Optimization
- [ ] Backend:
  - Add database indexes for commonly queried fields
  - Implement response caching (Redis or in-memory) if needed
  - Optimize N+1 queries
- [ ] Frontend:
  - Code splitting
  - Lazy load routes
  - Optimize images
  - Bundle size analysis

### TODO 8.6: Security Audit
- [ ] Review RLS policies in Supabase
- [ ] Ensure no sensitive data exposed in API responses
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS everywhere in production
- [ ] Environment variables properly secured

### TODO 8.7: Deployment
- [ ] Frontend:
  - Deploy to Vercel/Netlify/Cloudflare Pages
  - Configure environment variables
  - Set up custom domain
- [ ] Backend:
  - Deploy to Railway/Render/Fly.io
  - Configure environment variables
  - Set up health checks
- [ ] Database:
  - Already on Supabase (production tier if needed)
  - Set up backups
  - Monitor usage

### TODO 8.8: Monitoring & Analytics
- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics (PostHog, Plausible, or GA4)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Database performance monitoring (Supabase dashboard)

**Milestone**: App deployed and running in production!

---

## Summary Timeline Estimate (For Planning Only)

This is a rough estimate to help you plan, not a deadline:

- **Phase 0** (Setup): 1-2 days
- **Phase 1** (Database): 2-3 days
- **Phase 2** (Backend Foundation): 3-4 days
- **Phase 3** (Auth): 2-3 days
- **Phase 4** (Frontend Foundation): 3-4 days
- **Phase 5** (Applications/Essays UI): 4-5 days
- **Phase 6** (Search): 3-4 days
- **Phase 7** (Collaborators - Unified): 4-5 days
- **Phase 8** (Polish/Deploy): 3-5 days

**Total**: ~27-38 days of focused work (working solo, a few hours per day)

**Note**: Scholarship scraper integration has been deferred to a future phase. See `SCRAPER_PHASE.md` for details.

---

## Key Architectural Recommendations

### 1. Type Sharing: Use NPM Workspace (Not Git Submodules)

**Pros**:
- Simpler developer experience
- Instant type updates across packages
- Single `npm install` at root
- No git submodule complexity

**Setup**:
```json
// Root package.json
{
  "workspaces": ["web", "api", "shared"]
}

// shared/package.json
{
  "name": "@scholarship-hub/shared"
}

// web/package.json
{
  "dependencies": {
    "@scholarship-hub/shared": "*"
  }
}
```

### 2. Database: Supabase PostgreSQL

**Pros**:
- Managed PostgreSQL
- Built-in auth
- Row-level security (RLS)
- Real-time subscriptions (for future features)
- Free tier is generous

**Cons**:
- Vendor lock-in (but can export to any Postgres)

### 3. Backend: Node.js + Express + Supabase Client

**Alternative**: Fastify (faster, modern)
**Why Express**: More familiar, better ecosystem

### 4. Frontend: React + Vite + React Router

**Why**:
- Fast dev experience (Vite HMR)
- Modern React patterns (hooks, context)
- Type-safe with TypeScript

### 5. Scraper: Deferred to Future Phase

The scholarship scraper has been moved to a separate implementation phase. See `SCRAPER_PHASE.md` for full details on integrating the scraper in the future.

---

## Migration from Old Project

You don't need to migrate the old project directly. Instead:

**Reuse**:
1. **Type definitions** from `scholarship-types` → copy to `shared/src/types/`
2. **Business logic patterns** from `scholarship-tracker/server/` → adapt to new `api/`

**Don't Migrate**:
1. Vue/Quasar frontend → build fresh in React (`web/`)
2. MySQL database → design fresh PostgreSQL schema
3. Auth0 integration → use Supabase Auth
4. Knex.js queries → use Supabase client

---

## Next Steps

1. **Start with Phase 0**: Set up the monorepo and Supabase project
2. **Move to Phase 1**: Design and create database schema
3. **Build incrementally**: Each phase builds on the previous
4. **Test as you go**: Don't wait until the end to test

**Questions to Decide**:
- Do you want to use a UI library (Tailwind, MUI, shadcn/ui)?
- Backend: Express or Fastify?
- Do you want real-time features (Supabase real-time subscriptions)?

Let me know when you're ready to start Phase 0, and I can help with the specific implementation!
