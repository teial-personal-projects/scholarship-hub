# Scholarship Hub - Architecture Documentation

This document describes the architecture and structure of the Scholarship Hub application.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [Security](#security)
9. [Key Features](#key-features)
10. [API Endpoints](#api-endpoints)
11. [Data Flow](#data-flow)
12. [Development](#development)
13. [Testing Strategy](#testing-strategy)
14. [Future Features and Optimizations](#future-features-and-optimizations)
15. [Notes](#notes)
16. [Related Documentation](#related-documentation)

---

## Project Overview

Scholarship Hub is a scholarship application tracking system that helps students manage scholarship applications, essays, and collaborations with recommenders and essay reviewers.

**Purpose**: Track scholarship applications, manage essay writing and reviews, and coordinate with collaborators (recommenders and essay reviewers).

---

## Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **React Router DOM** - Client-side routing
- **Chakra UI** - Component library
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database and authentication

### Database
- **PostgreSQL** (via Supabase)
- **Row Level Security (RLS)** for data access control

### Infrastructure
- **Supabase** - Hosting (database, auth)
- **NPM Workspaces** - Monorepo management

---

## Project Structure

```
scholarship-hub/
├── package.json                 # Root workspace config
├── .env.local                  # Local environment variables
├── .gitignore
│
├── web/                        # React frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── components/         # Reusable UI components
│       │   └── ...
│       ├── pages/              # Page components (routes)
│       ├── contexts/           # React contexts
│       │   └── AuthContext.tsx
│       ├── services/           # API client
│       │   └── api.ts
│       ├── hooks/              # Custom React hooks
│       ├── utils/              # Frontend utilities
│       ├── config/             # Configuration
│       │   └── supabase.ts
│       └── test/               # Test utilities and fixtures
│
├── api/                        # Node.js backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts            # Express server entry point
│       ├── config/             # Configuration
│       │   ├── index.ts        # Environment config
│       │   └── supabase.ts     # Supabase client
│       ├── routes/             # Express routes
│       │   ├── index.ts        # Route aggregator

│       ├── controllers/        # Request handlers
│       ├── services/           # Business logic
│       ├── middleware/         # Express middleware
│       │   ├── auth.ts         # Authentication middleware
│       │   ├── role.ts         # Role-based access control
│       ├── migrations/         # Database migrations
│       │   ├── 001_users_profiles.sql
│       │   ├── 002_applications.sql
│       │   ├── ...
│       └── test/               # Test utilities and fixtures
│
├── shared/                     # Shared TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       └── types/
│           ├── api-responses.types.ts
│           ├── user.types.ts
│           └── ...
│
└── scholarship-finder/         # Python scraper (not currently in use)
    └── ...
```

---

## Frontend Architecture

### Routing

The app uses React Router DOM for client-side routing. Routes are defined in `web/src/App.tsx`:

**Public Routes:**
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/invite/:token` - Collaborator invitation acceptance

**Protected Routes (require authentication):**
- `/dashboard` - Main dashboard
- `/applications` - List of applications
- `/applications/new` - Create new application
- `/applications/:id` - View application details
- `/applications/:id/edit` - Edit application
- `/collaborators` - Manage collaborators
- `/collaborator/dashboard` - Collaborator-specific dashboard
- `/profile` - User profile settings

**Root Route:**
- `/` - Redirects to `/dashboard`

### State Management

- **React Context** - Authentication state (`AuthContext`)
- **TanStack Query** - Server state (API data, caching)
- **Local State** - Component-specific state with `useState`

### Component Structure

- **Pages** - Route-level components (`pages/`)
- **Components** - Reusable UI components (`components/`)
- **Contexts** - Global state providers (`contexts/`)
- **Hooks** - Custom React hooks (`hooks/`)

### Key Components

- `Navigation` - Top navigation bar
- `ProtectedRoute` - Route guard for authentication
- `ApplicationForm` - Form for creating/editing applications
- `DashboardReminders` - Dashboard reminders widget

---

## Backend Architecture

### Server Structure

The Express server is organized using a layered architecture:

1. **Routes** (`routes/`) - Define API endpoints
2. **Controllers** (`controllers/`) - Handle HTTP requests/responses
3. **Services** (`services/`) - Business logic
4. **Middleware** (`middleware/`) - Request processing (auth, error handling)

### Request Flow

```
HTTP Request
    ↓
Route Handler (routes/*.routes.ts)
    ↓
Auth Middleware (if protected)
    ↓
Role Middleware (if role-specific)
    ↓
Controller (controllers/*.controller.ts)
    ↓
Service (services/*.service.ts)
    ↓
Database (Supabase)
    ↓
Response
```

### Middleware

- **auth** - Verifies JWT token, attaches user to request
- **requireRole** - Checks user roles (student, recommender, collaborator)
- **asyncHandler** - Wraps async route handlers for error handling
- **errorHandler** - Global error handler

---

## Database Schema

### Core Tables

**users**
- User accounts (managed by Supabase Auth)
- Profile information (email, name, etc.)

**user_profiles**
- Extended user profile data
- Links to `users` table via `auth_user_id`

**applications**
- Scholarship applications
- Belongs to users
- Contains scholarship details, deadlines, status

**collaborators**
- Recommenders and essay reviewers
- Links users who can collaborate

**collaborations**
- Active collaborations between students and collaborators
- Tracks collaboration type (recommendation, essay review)
- Links applications to collaborators

**essays**
- Essays associated with applications
- Can have multiple drafts
- Links to collaborations for reviews

**recommendations**
- Recommendation letters
- Links to collaborations and applications

### Additional Tables

- **reminders** - System-generated reminders
- **invitations** - Collaborator invitations
- **scholarships** - Scholarship data (for internal use, not exposed to users)
- **scholarship_sources** - Scholarship resource websites and organizations (for planned Scholarship Resources page)
- **finder_jobs** - Scraper job tracking (for internal use, not currently in use)

See `docs/database-schema.md` for detailed schema documentation.

---

## Authentication & Authorization

### Authentication

- **Supabase Auth** - Handles user authentication
- **JWT Tokens** - Used for API authentication
- **Frontend** - AuthContext manages auth state
- **Backend** - `auth` middleware verifies tokens

### Authorization

**Role-Based Access Control (RBAC):**

- **student** - Can create/manage applications
- **recommender** - Can write recommendations
- **collaborator** - Can review essays

**Protected Routes:**
- Most routes require authentication
- Some routes require specific roles (e.g., student-only routes)
- Collaborator routes accessible by collaborators

**Data Access:**
- Row Level Security (RLS) policies enforce data access
- Users can only access their own data
- Collaborators can access data for their collaborations

---

## Security

### Current Security Measures

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-Based Access Control (RBAC) with middleware
- **Database Security**: Row Level Security (RLS) policies in PostgreSQL
- **HTTP Security**: Helmet.js middleware for security headers
- **CORS**: Configured to restrict cross-origin requests

### Security Improvements Needed

1. **CSRF Protection**
   - Implement CSRF token validation for state-changing requests
   - Use CSRF middleware for POST, PUT, PATCH, DELETE endpoints
   - Generate and validate tokens on form submissions

2. **Input Sanitization**
   - Sanitize all user input to prevent XSS attacks
   - Implement input validation with Zod schemas for all endpoints
   - Sanitize HTML content in user-generated text (essays, notes, etc.)
   - Escape user input before database queries

3. **Rate Limiting**
   - Implement rate limiting on authentication endpoints
   - Add rate limiting for API endpoints to prevent abuse
   - Configure different limits for different endpoint types

4. **Security Audit Tasks**
   - Review and strengthen Row Level Security (RLS) policies in Supabase
   - Audit API responses for sensitive data exposure
   - Ensure HTTPS everywhere in production
   - Review and secure environment variable usage
   - Perform security vulnerability scanning
   - Regular dependency updates for security patches

---

## Key Features

### 1. Application Management

- **Create Applications** - Students create scholarship applications
- **View Applications** - List and view application details
- **Edit Applications** - Update application information
- **Track Status** - Monitor application status (in progress, submitted, etc.)
- **Deadlines** - Track application deadlines
- **Reminders** - System-generated reminders for upcoming deadlines

### 2. Collaboration System

- **Invite Collaborators** - Students invite recommenders/reviewers
- **Collaborator Dashboard** - Collaborators see their assigned work
- **Recommendations** - Recommenders write recommendation letters
- **Essay Reviews** - Essay reviewers provide feedback on essays

### 3. Essay Management

- **Create Essays** - Add essays to applications
- **Multiple Drafts** - Track essay versions
- **Review System** - Collaborators review and provide feedback
- **Status Tracking** - Track essay completion status

### 4. User Profile

- **Profile Settings** - Update user information
- **Preferences** - Manage notification preferences
- **Account Management** - Password reset, etc.

### 5. Scholarship Resources (Planned)

- **Resource Display** - Page showing curated scholarship resource websites
- **External Links** - Links to external scholarship search websites
- **Categories** - Resources organized by category/tags
- **Status**: ⏳ To Be Implemented

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update current user profile
- `GET /api/users/me/roles` - Get user roles
- `GET /api/users/me/reminders` - Get user reminders (students only)

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application details
- `PATCH /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Collaborators
- `GET /api/collaborators` - List collaborators
- `POST /api/collaborators` - Add collaborator
- `DELETE /api/collaborators/:id` - Remove collaborator

### Collaborations
- `GET /api/collaborations` - List collaborations
- `POST /api/collaborations` - Create collaboration
- `GET /api/collaborations/:id` - Get collaboration details
- `PATCH /api/collaborations/:id` - Update collaboration

### Recommendations
- `GET /api/recommendations` - List recommendations
- `POST /api/recommendations` - Create recommendation
- `GET /api/recommendations/:id` - Get recommendation details
- `PATCH /api/recommendations/:id` - Update recommendation

### Essays
- `GET /api/essays` - List essays
- `POST /api/essays` - Create essay
- `GET /api/essays/:id` - Get essay details
- `PATCH /api/essays/:id` - Update essay
- `DELETE /api/essays/:id` - Delete essay

### Cron/Background Jobs
- `POST /api/cron/send-reminders` - Send reminder emails (internal)

### Webhooks
- `POST /api/webhooks/*` - Webhook endpoints (internal)

### Resources (Planned)
- `GET /api/resources` - Get scholarship resources (to be implemented)

---

## Data Flow

### Creating an Application

```
User fills form (ApplicationForm component)
    ↓
Frontend validates input
    ↓
POST /api/applications
    ↓
Auth middleware verifies user
    ↓
Applications Controller
    ↓
Applications Service
    ↓
Database (insert into applications table)
    ↓
Return application data
    ↓
Frontend updates UI (TanStack Query cache)
```

### Collaborator Invitation Flow

```
Student invites collaborator
    ↓
POST /api/collaborators (with email)
    ↓
System creates invitation record
    ↓
Email sent to collaborator
    ↓
Collaborator clicks invite link (/invite/:token)
    ↓
Collaborator accepts invitation
    ↓
Collaboration created
    ↓
Collaborator can now access their dashboard
```

### Essay Review Flow

```
Student creates essay draft
    ↓
Student creates collaboration with essay reviewer
    ↓
Collaborator receives notification
    ↓
Collaborator views essay in their dashboard
    ↓
Collaborator provides feedback
    ↓
Student sees feedback and updates essay
    ↓
Process repeats until essay is finalized
```

---

## Development

### Running the Application

**Frontend:**
```bash
cd web
npm run dev
```

**Backend:**
```bash
cd api
npm run dev
```

### Database Migrations

```bash
cd api
npm run migrate:latest
```

---

## Testing Strategy

The application has comprehensive testing infrastructure for both backend and frontend.

### Backend Testing

**Framework**: Vitest with Supertest for integration tests

**Test Structure:**
- **Unit Tests** - Service layer tests (`services/*.test.ts`)
  - Tests business logic with mocked Supabase client
  - Covers all major service methods (users, applications, essays, collaborators, collaborations, recommendations)
  - Tests success paths, error handling, and edge cases
- **Integration Tests** - API endpoint tests (`routes/*.test.ts`)
  - Tests full request/response cycle using Supertest
  - Tests authentication, authorization, and RLS policy enforcement
  - Tests CRUD operations and error handling (404, 401, 403, 400)

**Test Utilities:**
- Mock Supabase client with query builder chaining
- Mock authentication middleware for injecting test users
- Test fixtures for users, applications, essays, collaborators, collaborations
- Helper functions for authenticated requests and assertions

**Running Tests:**
```bash
cd api
npm test              # Run tests in watch mode
npm run test:ui       # Run tests with interactive UI
npm run test:coverage # Generate coverage report
```

### Frontend Testing

**Framework**: Vitest with React Testing Library

**Test Structure:**
- **Component Tests** - Reusable component tests (`components/*.test.tsx`)
  - Tests form components, dialogs, and UI components
  - Tests user interactions, validation, and error handling
- **Page Tests** - Integration tests for page components (`pages/*.test.tsx`)
  - Tests complete user flows (authentication, data fetching, CRUD operations)
  - Tests navigation, filtering, and state management
  - Tests loading, error, and empty states

**Test Utilities:**
- Custom render helpers with ChakraProvider and Router
- Mock API service and Supabase client
- Test fixtures matching backend structure
- Helpers for authenticated rendering

**Running Tests:**
```bash
cd web
npm test              # Run tests in watch mode
npm run test:ui       # Run tests with interactive UI
npm run test:coverage # Generate coverage report
```

### Test Coverage

- Backend services: Comprehensive unit tests for all service methods
- Backend routes: Integration tests for all API endpoints
- Frontend components: Tests for reusable UI components
- Frontend pages: Integration tests for major user flows

### Future Testing Work

- End-to-End (E2E) tests with Playwright (see `IMPLEMENTATION_E2E_TESTING_PLAN.md`)
- Continuous Integration (CI) pipeline for automated testing
- Coverage thresholds and quality gates

## Future Features and Optimizations

The following items are planned for future implementation to enhance the application:

### Error Handling & Validation

1. **Review Error Handling**
   - Review all API endpoints for consistent error handling
   - Standardize error response formats across all endpoints
   - Implement error boundaries in frontend React components

2. **Input Validation**
   - Add comprehensive input validation with Zod schemas for all endpoints
   - Validate request bodies, query parameters, and path parameters
   - Return clear validation error messages

### Performance Optimization

3. **Database Optimization**
   - Add database indexes for commonly queried fields
   - Optimize N+1 queries in service layer (use JOINs and nested selects)
   - Query performance analysis and optimization

4. **Frontend Performance**
   - Code splitting for route-based lazy loading
   - Optimize images and assets
   - Bundle size analysis and optimization
   - React component performance optimization (memoization, virtualization)

### Deployment

5. **Production Deployment**
   - See `STAGING_DEPLOYMENT.md` for detailed deployment plan including:
     - Frontend deployment (Vercel/Netlify/Cloudflare)
     - Backend deployment (Railway/Render/Fly.io)
     - Database configuration and backups
     - Environment variables setup
     - Pre and post-deployment checklists

### New Features

6. **Scholarship Resources Page**
   - A page that displays curated resources (websites, organizations, etc.) to help users find scholarships externally
   - Resources stored in the `scholarship_sources` table
   
   **Implementation Steps:**
   - Create `GET /api/resources` endpoint that queries `scholarship_sources` table
   - Create `web/src/pages/ScholarshipResources.tsx` page component
   - Display resources as cards with: name, URL (clickable), description, category/tags
   - Add route to `web/src/App.tsx`: `<Route path="/resources" element={<ScholarshipResources />} />`
   - Add navigation menu item in `web/src/components/Navigation.tsx`
   
   **Database:**
   - `scholarship_sources` table already exists (migration 012)
   - Contains: name, URL, description, category/tags, enabled status

---

## Notes

- The application does **not** include scholarship search or recommendation features
- Scholarship finder/scraper infrastructure exists but is **not currently in use**
- All scholarship data is for internal/research purposes only
- Users manually add their own scholarship applications to track

---

## Related Documentation

- `docs/database-schema.md` - Complete database schema documentation
- `SCHOLARSHIP_FINDER_IMPLEMENTATION.md` - Scholarship finder/scraper details (not in use)
- `TESTING_INVITATIONS.md` - Testing guide for invitations
- `STAGING_DEPLOYMENT.md` - Deployment guide
