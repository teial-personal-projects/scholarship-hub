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
4. Use Supabase Auth API to get a token:

```bash
curl -X POST 'https://ljzvgcbtstxozqlvvzaf.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "teial.dickens@gmail.com",
    "password": "YOUR_PASSWORD"
  }'
```

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

### Essays API

- `GET /api/applications/:applicationId/essays` - List essays for an application
- `POST /api/applications/:applicationId/essays` - Create new essay
- `GET /api/essays/:id` - Get essay details
- `PATCH /api/essays/:id` - Update essay
- `DELETE /api/essays/:id` - Delete essay

#### Testing Essays Endpoints

```bash
# List all essays for an application (replace APPLICATION_ID with actual ID)
curl http://localhost:3001/api/applications/1/essays \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a new essay
curl -X POST http://localhost:3001/api/applications/1/essays \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "Why I deserve this scholarship",
    "units": "words",
    "essayLink": "https://docs.google.com/document/d/...",
    "wordCount": 500
  }'

# Get a specific essay
curl http://localhost:3001/api/essays/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update an essay
curl -X PATCH http://localhost:3001/api/essays/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "Updated essay theme",
    "wordCount": 600
  }'

# Delete an essay
curl -X DELETE http://localhost:3001/api/essays/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Future Endpoints

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

## RLS Policy Enforcement

The API uses Supabase's service role key which bypasses Row Level Security (RLS) at the database level. However, **all service layer functions manually enforce the same ownership checks** that RLS policies would enforce:

- **Essays**: All operations verify that the essay belongs to an application owned by the authenticated user
- **Applications**: All operations verify that the application belongs to the authenticated user
- **Users**: All operations verify that the profile belongs to the authenticated user

This dual-layer approach ensures security even when using the service role key. The RLS policies defined in the migrations (`003_essays.sql`, etc.) provide an additional security layer if the API were to use the anon key instead.
