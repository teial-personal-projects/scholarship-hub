# API Testing Guide

## Overview

The API requires authentication via Supabase JWT tokens for all protected endpoints.

## Running the API

```bash
# From project root
npm run dev --workspace=api

# Server will start on http://localhost:3001
```

## Testing Endpoints

### Health Check (No Auth Required)

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-28T..."
}
```

### Protected Endpoints (Auth Required)

All `/api/*` endpoints require a valid Supabase JWT token in the `Authorization` header.

#### Getting a Test Token

**Option 1: Use Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Find user: `teial.dickens@gmail.com` (auth_user_id: `fcb86d3c-aa8c-4245-931b-a584ac4afbe0`)
3. Set a password for this user (if not already set)
4. **Confirm the email** (click "Confirm email" button in the dashboard, or see Option 1b below)
5. Use Supabase Auth API to get a token:

```bash
curl -X POST 'https://ljzvgcbtstxozqlvvzaf.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "teial.dickens@gmail.com",
    "password": "YOUR_PASSWORD"
  }'
```

**Option 1b: Confirm Email Programmatically (If you get "email_not_confirmed" error)**

If you're getting an `email_not_confirmed` error, you can confirm the email using this script:

```bash
# From the api directory
npx tsx src/scripts/confirm-user-email.ts teial.dickens@gmail.com
```

This script will:
- Find the user by email
- Confirm their email address (bypasses email confirmation requirement)
- Allow you to authenticate immediately

**Alternative: Disable Email Confirmation (Development Only)**

For development, you can disable email confirmation in Supabase:
1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Email Auth", toggle off "Enable email confirmations"
3. Save changes

⚠️ **Warning**: Only disable email confirmation in development environments, never in production!

**Option 2: Use Frontend (Once Built)**
The frontend will handle authentication and provide tokens automatically.

#### Testing with Token

Once you have a token:

```bash
# Get current user profile
curl http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update user profile
curl -X PATCH http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Teial",
    "lastName": "Dickens",
    "phoneNumber": "555-1234"
  }'

# Get user roles
curl http://localhost:3001/api/users/me/roles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get search preferences
curl http://localhost:3001/api/users/me/search-preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update search preferences
curl -X PATCH http://localhost:3001/api/users/me/search-preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "Merit",
    "minAward": 1000,
    "academicLevel": "Undergraduate"
  }'
```

## Available Endpoints

### Users API

- `GET /api/users/me` - Get current user profile (includes search preferences)
- `PATCH /api/users/me` - Update current user profile
- `GET /api/users/me/roles` - Get user roles
- `GET /api/users/me/search-preferences` - Get search preferences
- `PATCH /api/users/me/search-preferences` - Update search preferences

### Future Endpoints

- Applications API (TODO 2.6)
- Essays API (TODO 2.7)
- Collaborators API (TODO 2.8)
- Collaborations API (TODO 2.9)
- Recommendations API (TODO 2.10)

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "The requested resource was not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

## Database User Info

Current test user in database:
- **ID**: 1
- **Email**: teial.dickens@gmail.com
- **Auth User ID**: fcb86d3c-aa8c-4245-931b-a584ac4afbe0

## Notes

- All API responses use camelCase (TypeScript convention)
- Database uses snake_case (PostgreSQL convention)
- Conversion happens automatically at the API boundary
- All timestamps are in ISO 8601 format
- Protected endpoints check user ownership via RLS policies
