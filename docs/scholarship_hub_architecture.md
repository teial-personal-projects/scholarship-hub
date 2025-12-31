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
11. [Deployment](#deployment)
12. [Database (Supabase)](#database-supabase)
13. [Related Documentation](#related-documentation)

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

- **auth** - Verifies Supabase authentication token, attaches user to request
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

- **Supabase Auth** - Handles user authentication (Supabase manages JWT tokens internally)
- **Frontend** - AuthContext manages auth state using Supabase client
- **Backend** - `auth` middleware verifies tokens using Supabase's `getUser()` method

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

- **Authentication**: Supabase Auth (handles tokens internally)
- **Authorization**: Role-Based Access Control (RBAC) with middleware
- **Database Security**: Row Level Security (RLS) policies in PostgreSQL
- **HTTP Security**: Helmet.js middleware for security headers
- **CORS**: Configured to restrict cross-origin requests

#### TODO
1. [ ] **CSRF Protection**
   - Implement CSRF token validation for state-changing requests
   - Use CSRF middleware for POST, PUT, PATCH, DELETE endpoints
   - Generate and validate tokens on form submissions

2. [ ] **Input Sanitization**
   - Sanitize all user input to prevent XSS attacks
   - Implement input validation with Zod schemas for all endpoints
   - Sanitize HTML content in user-generated text (essays, notes, etc.)
   - Escape user input before database queries

3. [ ] **Rate Limiting**
   - Implement rate limiting on authentication endpoints
   - Add rate limiting for API endpoints to prevent abuse
   - Configure different limits for different endpoint types

### Security Improvements Needed

1. **Security Audit Tasks**
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

## Deployment

### Deployment Checklist
#### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] CORS configured correctly
- [ ] Health check endpoint working
- [ ] Error tracking configured (optional)
- [ ] Backup strategy in place
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates active

#### Post-Deployment Verification

- [ ] Verify all pages load correctly
- [ ] Test authentication flow (login, register, password reset)
- [ ] Test core features:
  - [ ] Create/view/edit applications
  - [ ] Add collaborators
  - [ ] Upload essays and documents
  - [ ] Set reminders
- [ ] Check error tracking is receiving data (if configured)
- [ ] Monitor initial performance metrics
- [ ] Verify uptime monitoring is active (if configured)

###  Backend Deployment (Railway)

#### Steps
- [ ] **Step 1:** Create Railway project
  1. Go to https://railway.app
  2. Click **"Start a New Project"**
  3. Select **"Deploy from GitHub repo"**
  4. Authorize Railway to access your GitHub account
  5. Select your repository
  6. Railway will auto-detect and start building

- [ ] **Step 2:** Configure environment variables
  - In Railway dashboard, click on your deployed service
  - Go to **"Variables"** tab
  - Add the following environment variables:
    - `DATABASE_URL` - Supabase connection string
    - `SUPABASE_URL` - Supabase project URL
    - `SUPABASE_ANON_KEY` - Supabase 
    - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
    - `NODE_ENV=production`
    - `PORT` - Server port (usually auto-assigned)
    - `RESEND_API_KEY` - Email service API key
  - Click **"Deploy"** to restart with new variables

- [ ] **Step 3:** Configure health checks
  - Go to **"Settings"** → **"Health Checks"**
  - Set health check path: `/api/health`
  - Set timeout: 30 seconds

- [ ] **Step 4:** Enable always-on service
  - Go to **"Settings"** → **"Service"**
  - Ensure service is on **"Always On"** plan ($5/month)

- [ ] **Step 5:** Configure resource limits (optional)
  - Go to **"Settings"** → **"Resources"**
  - Set memory limit: 512MB-1GB (should be sufficient)
  - Set CPU limit: 1-2 vCPUs

- [ ] **Step 6:** Set up custom domain (optional)
  - Go to **"Settings"** → **"Domains"**
  - Add custom domain (e.g., `api.yourdomain.com`)
  - Update your DNS records as instructed

- [ ] **Step 7:** Configure start command
  - Set start command: `npm start`

- [ ] **Step 8:** Set up automatic deployments from git branch

- [ ] **Step 9:** Configure CORS to allow frontend domain

- [ ] **Step 10:** Verify deployment
  - Copy your Railway deployment URL (e.g., `https://your-app.up.railway.app`)
  - Test the health endpoint:
    ```bash
    curl https://your-app.up.railway.app/api/health
    ```

### Frontend Deployment (Cloudflare Pages)

1. **Update `web/.env.production` (create if doesn't exist):**

```bash
VITE_API_URL=https://your-app.up.railway.app
```

2. **Update `web/vite.config.js` for production:**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for production
  }
})
```

3. **Test production build locally:**

```bash
cd web
npm run build
npm run preview
```

#### [ ] 5.2 Deploy to Cloudflare Pages

1. Go to https://dash.cloudflare.com
2. Navigate to **"Workers & Pages"**
3. Click **"Create application"** → **"Pages"** → **"Connect to Git"**
4. Authorize Cloudflare to access your GitHub account
5. Select your `scholar_source` repository

#### 5.3[ ] Configure Build Settings

1. **Framework preset**: Select **"Vite"** (or None)
2. **Build command**:
   ```bash
   cd web && npm install && npm run build
   ```
3. **Build output directory**:
   ```
   web/dist
   ```
4. **Root directory**: Leave empty (or set to `/`)

#### 5.4 [ ] Add Environment Variables

1. Click **"Environment variables"**
2. Add the following:

```bash
VITE_API_URL=https://your-app.up.railway.app
```

3. Select **"Production"** environment
4. Click **"Save"**

#### [ ] 5.5 Deploy

1. Click **"Save and Deploy"**
2. Wait for build to complete (~2-5 minutes)
3. Cloudflare will provide a temporary URL: `https://mywebsiste.pages.dev`

#### [ ] 5.6 Configure Custom Domain (Optional) 

1. Go to **"Custom domains"** tab
2. Click **"Set up a custom domain"**
3. Enter your domain (e.g., `app.yourdomain.com` or `yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate to provision (~5-10 minutes)

#### [ ] 5.7 Verify Frontend Deployment

1. Visit your Cloudflare Pages URL: `https://mywebsite.pages.dev`
2. Test the form submission workflow:
   - Fill in course information
   - Submit the form
   - Wait for job to complete
   - Verify results display correctly
3. Test copy and export buttons

---

## Database (Supabase)

### Configuration
**Current Setup**: Already on Supabase

- [ ] **Step 1:** Upgrade to production tier if needed (evaluate based on usage)
- [ ] **Step 2:** Set up automated backups
  - Supabase Pro includes daily backups
  - Configure backup retention policy
- [ ] **Step 3:** Monitor database usage
  - Database size
  - Connection pool usage
  - Query performance
- [ ] **Step 4:** Review and optimize Row Level Security (RLS) policies
- [ ] **Step 5:** Set up database alerts for:
  - High CPU usage
  - High disk usage
  - Connection pool exhaustion

#### 5.4 SSL/TLS

- [ ] **Frontend**: Verify automatic SSL via Cloudflare Pages
- [ ] **Backend**: Verify automatic SSL via Railway
- [ ] **Database**: Verify Supabase SSL is enabled (enabled by default)

#### 5.5 Environment Variables Reference

**Frontend (.env.production)**:
```bash
VITE_API_URL=https://api.scholarshiphub.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (.env.production)**:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
RESEND_API_KEY=your-resend-api-key
```



### New Features


## Related Documentation

- `docs/database-schema.md` - Complete database schema documentation
- `docs/SCHOLARSHIP_FINDER_IMPLEMENTATION.md` - Scholarship finder/scraper details (not in use)
- `docs/TESTING_INVITATIONS.md` - Testing guide for invitations
