# Scholarship Hub

A scholarship application tracking system that helps students manage scholarship applications, essays, and collaborations with recommenders and essay reviewers.

## Purpose

Scholarship Hub provides a centralized platform for students to:
- Track multiple scholarship applications and their deadlines
- Manage essay writing with version control and review workflows
- Coordinate with recommenders and essay reviewers
- Receive reminders for upcoming deadlines

## Project Structure

This is a monorepo managed with NPM workspaces, containing three main packages:

```
scholarship-hub/
├── web/          # React frontend (Vite + TypeScript)
├── api/          # Node.js backend (Express + TypeScript)
└── shared/       # Shared TypeScript types and utilities
```

### Frontend (`web/`)
- **React 18** with TypeScript
- **Vite** for build tooling and dev server
- **Chakra UI** for components
- **TanStack Query** for data fetching
- **React Router** for routing

### Backend (`api/`)
- **Node.js 24.12+** with Express
- **TypeScript** for type safety
- **Supabase** for database and authentication
- **Zod** for input validation
- **DOMPurify** for HTML sanitization

### Shared (`shared/`)
- Shared TypeScript types used by both frontend and backend
- Validation schemas
- Utility functions

## Prerequisites

- **Node.js**: 24.12.0 or higher
- **npm**: 10.0.0 or higher
- **Supabase Account**: For database and authentication
- **Resend Account**: For email sending (optional, for invitations)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd scholarship-hub
```

### 2. Install Dependencies

Install dependencies for all workspaces:

```bash
npm install
```

This will install dependencies for the root workspace and all sub-workspaces (`web`, `api`, `shared`).

### 3. Build Shared Package

The shared package must be built before running the frontend or backend:

```bash
npm run build:shared
```

## Environment Variables

### Backend Environment Variables

Create a `.env.local` file in the root directory (or `.env.local` in the `api/` directory) with the following variables:

```bash
# Node Environment
NODE_ENV=local
PORT=3001

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend Email Service (optional, for invitations)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx

# Application URL (for generating invite links)
APP_URL=http://localhost:5173
```

**Required Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (found in Supabase Dashboard → Settings → API)

**Optional Variables:**
- `RESEND_API_KEY` - Required for sending email invitations
- `RESEND_WEBHOOK_SECRET` - Required for webhook signature verification
- `APP_URL` - Frontend URL (defaults to `http://localhost:5173`)

### Frontend Environment Variables

Create a `.env.local` file in the `web/` directory (or root directory) with:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API URL (only needed for production builds)
# For local development, Vite proxy handles this automatically
VITE_API_URL=http://localhost:3001
```

**Required Variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (found in Supabase Dashboard → Settings → API)

**Optional Variables:**
- `VITE_API_URL` - Backend API URL (only needed for production; local dev uses proxy)

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Getting Resend Credentials (Optional)

1. Sign up at [Resend](https://resend.com)
2. Create an API key in the dashboard
3. Copy the API key → `RESEND_API_KEY`
4. For webhooks, create a webhook endpoint and copy the secret → `RESEND_WEBHOOK_SECRET`

## Database Setup

### Run Migrations

The database migrations are located in `api/src/migrations/`. Run them in order:

1. Connect to your Supabase project
2. Go to **SQL Editor** in Supabase Dashboard
3. Run each migration file in order (001, 002, 003, etc.)

Alternatively, you can use the Supabase CLI or run migrations programmatically.

## Running the Application

### Development Mode

Run both frontend and backend concurrently:

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Run Frontend Only

```bash
npm run dev:web
```

Frontend will be available at http://localhost:5173

### Run Backend Only

```bash
npm run dev:api
```

Backend API will be available at http://localhost:3001

### Production Build

Build all packages:

```bash
npm run build
```

Then start the backend:

```bash
cd api
npm start
```

## Available Scripts

### Root Level

- `npm run dev` - Run both frontend and backend in development mode
- `npm run dev:web` - Run only frontend
- `npm run dev:api` - Run only backend
- `npm run build` - Build all packages
- `npm run build:shared` - Build shared package only
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages

### Frontend (`web/`)

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

### Backend (`api/`)

- `npm run dev` - Start Express server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Start production server
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

## Project Architecture

- **System Design Document**: `docs/scholarship_hub_system_design.md` - High-level architecture and design decisions
- **Technical Design Document**: `docs/scholarship_hub_technical_design.md` - Implementation details and technical specifications
- **Database Schema**: `docs/database-schema.md` - Complete database schema documentation
- **Testing Guide**: `docs/testing_guide.md` - Testing instructions and scenarios

## Key Features

- **Application Management**: Create, track, and manage scholarship applications
- **Essay Management**: Write essays with version control and review workflows
- **Collaboration System**: Invite recommenders and essay reviewers
- **Reminders**: Automated reminders for upcoming deadlines
- **User Profiles**: Manage user information and preferences

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Chakra UI
- TanStack Query
- React Router
- Axios

### Backend
- Node.js 24.12+
- Express
- TypeScript
- Supabase (PostgreSQL + Auth)
- Zod (validation)
- DOMPurify (sanitization)
- Helmet.js (security headers)
- express-rate-limit

## Security

The application implements comprehensive security measures:
- JWT bearer token authentication
- Input validation with Zod schemas
- HTML sanitization with DOMPurify
- Rate limiting on API endpoints
- Security headers via Helmet.js
- Row Level Security (RLS) in database

See `docs/scholarship_hub_system_design.md` Section 10 for security implementation status.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test` (in respective workspace)
4. Run type checking: `npm run type-check`
5. Submit a pull request

## License

[Add your license here]

---

For detailed documentation, see the `docs/` directory.

