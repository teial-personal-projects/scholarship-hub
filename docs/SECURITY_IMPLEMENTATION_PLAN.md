# Security Implementation Plan

**Last Updated**: 2025-12-30

This document provides a detailed implementation plan for the critical security features identified in the application architecture: JWT Security, Input Sanitization, and Rate Limiting.

---

## Table of Contents

1. [CSRF Protection Analysis](#1-csrf-protection-analysis)
2. [JWT Security Best Practices](#2-jwt-security-best-practices)
3. [Input Sanitization](#3-input-sanitization)
4. [Rate Limiting](#4-rate-limiting)
5. [Implementation Order](#implementation-order)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)

---

## 1. CSRF Protection Analysis

**Status**: ✅ **NOT REQUIRED FOR THIS APPLICATION**

### Why CSRF Protection is NOT Needed

This application uses **stateless JWT bearer token authentication** and does NOT need CSRF protection. Here's why:

### Authentication Architecture Analysis

**Current Implementation:**
- ✅ **JWT Bearer Tokens** stored client-side (managed by Supabase SDK)
- ✅ **Stateless authentication** - no server-side sessions
- ✅ **Authorization headers** - tokens sent via `Authorization: Bearer {token}`
- ✅ **NO cookies** used for authentication
- ✅ **NO automatically-sent credentials** by the browser

**Code Evidence:**

Frontend ([web/src/services/api.ts:73-78](web/src/services/api.ts#L73-L78)):
```typescript
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,  // ← Manually added by JavaScript
  ...options.headers,
};
```

Backend ([api/src/middleware/auth.ts:15-21](api/src/middleware/auth.ts#L15-L21)):
```typescript
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  // Reject requests without proper Authorization header
  return res.status(401).json({ error: 'Unauthorized' });
}

const token = authHeader.substring(7); // Extract JWT from 'Bearer {token}'
```

### OWASP Guidance on CSRF and SPAs

According to the [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html):

> **"You only need CSRF protection if the browser automatically sends credentials (cookies, HTTP authentication, client certificates)."**
>
> **"If you use strictly bearer tokens in Authorization headers from SPAs (no cookies, no auto-sent credentials), classic CSRF attacks do not work and a CSRF library may be unnecessary."**

### Why CSRF Attacks Cannot Work Here

**How CSRF Attacks Work:**
1. Victim is authenticated to `legitimate-site.com` (has session cookie)
2. Victim visits `attacker-site.com`
3. Attacker site makes request to `legitimate-site.com`
4. **Browser automatically includes the session cookie**
5. Server sees valid cookie and processes malicious request

**Why It Doesn't Work With JWT Bearer Tokens:**
1. Victim is authenticated (has JWT token in memory/localStorage)
2. Victim visits `attacker-site.com`
3. Attacker site tries to make request to our API
4. **Browser DOES NOT automatically include Authorization headers**
5. Server sees no `Authorization: Bearer {token}` header → request rejected with 401

**Key Point:** JavaScript from `attacker-site.com` cannot access tokens stored by `legitimate-site.com` due to Same-Origin Policy.

### What We Do Instead: JWT Security

Since we don't need CSRF protection, we focus on **JWT-specific security** (see Section 2 below).

### When You WOULD Need CSRF Protection

CSRF protection would be required if:
- ❌ Using session cookies for authentication
- ❌ Using `credentials: 'include'` with cookies
- ❌ Using HTTP Basic Authentication
- ❌ Using client certificates
- ❌ Any authentication mechanism where browsers auto-send credentials

### References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SPA Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- [Auth0: SPA + API Architecture](https://auth0.com/docs/get-started/authentication-and-authorization-flow/implicit-flow-with-form-post)

---

## 2. JWT Security Best Practices

**Priority**: HIGH
**Estimated Time**: 6-8 hours
**Risk Level**: HIGH (without proper JWT security, tokens can be compromised)

### What is JWT Security?

Since this application uses JWT bearer tokens instead of sessions, we need to implement JWT-specific security measures to prevent token theft, XSS attacks, and token replay attacks.

### Implementation Steps

#### 2.1 Secure Token Storage (Frontend)

**Current Status:** Supabase SDK handles token storage automatically, but we should verify best practices.

- [ ] Review Supabase token storage implementation

**Best Practices:**
- ✅ **Memory Storage (Best)**: Store tokens in JavaScript memory (variables/state) - Lost on refresh but most secure
- ⚠️ **SessionStorage (Good)**: Tokens cleared when tab closes - Better than localStorage
- ❌ **LocalStorage (Risky)**: Vulnerable to XSS - Avoid if possible

**Supabase Default:** Uses localStorage by default. Consider switching to sessionStorage for better security.

- [ ] Update Supabase client configuration: `web/src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage, // Use sessionStorage instead of localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

**Trade-offs:**
- sessionStorage: More secure, but users must re-login on new tabs
- localStorage: Less secure, but better UX (persists across tabs/refreshes)

Choose based on your security requirements vs. user experience needs.

#### 2.2 Token Expiration and Refresh

**Current Status:** Supabase handles automatic token refresh.

- [ ] Verify token expiration settings are secure

**Recommended Token Lifetimes:**
- **Access Token**: 1 hour (3600 seconds)
- **Refresh Token**: 7-30 days

- [ ] Check Supabase project settings for token expiration (in Supabase Dashboard → Authentication → Settings)

- [ ] Implement token refresh error handling: `web/src/services/api.ts`

```typescript
import { supabase } from '../config/supabase';

// Add to API interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we get a 401, try to refresh the token
    if (error.response?.status === 401) {
      const { data, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !data.session) {
        // Refresh failed, redirect to login
        await supabase.auth.signOut();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Retry the original request with new token
      const newToken = data.session.access_token;
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api.request(error.config);
    }

    return Promise.reject(error);
  }
);
```

#### 2.3 XSS Protection (Critical for JWT Security)

Since JWTs are stored client-side, they're vulnerable to XSS attacks. Implement these protections:

- [ ] Install security headers middleware: `helmet`

```bash
cd api
npm install helmet
```

- [ ] Add Helmet middleware to Express: `api/src/index.ts`

```typescript
import helmet from 'helmet';

const app = express();

// Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove 'unsafe-inline' in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
```

- [ ] Implement Content Security Policy (CSP) in frontend: `web/index.html`

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://*.supabase.co;">
```

**Note:** Input sanitization (Section 3) is the primary defense against XSS.

#### 2.4 CORS Configuration

- [ ] Verify CORS is properly configured: `api/src/index.ts`

```typescript
import cors from 'cors';

const app = express();

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL // e.g., 'https://yourapp.com'
    : 'http://localhost:5173', // Vite dev server
  credentials: false, // We don't use cookies, so this should be false
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
```

**Important:** `credentials: false` since we don't use cookies for authentication.

#### 2.5 Token Validation on Backend

**Current Status:** Already implemented via Supabase auth middleware.

- [ ] Verify auth middleware validates tokens properly: `api/src/middleware/auth.ts`

Ensure it checks:
- ✅ Token is present
- ✅ Token format is valid (Bearer scheme)
- ✅ Token signature is valid (Supabase validates this)
- ✅ Token is not expired (Supabase validates this)
- ✅ User exists in Supabase

#### 2.6 Implement Token Revocation Strategy

**Current Implementation:** Tokens are revoked when user logs out via Supabase.

- [ ] Add server-side logout endpoint: `api/src/routes/auth.routes.ts`

```typescript
import { supabase } from '../config/supabase';

router.post('/logout', auth, async (req, res) => {
  try {
    // Extract token from request
    const token = req.headers.authorization?.substring(7);

    if (token) {
      // Sign out the user on Supabase (revokes refresh token)
      const { error } = await supabase.auth.admin.signOut(token);

      if (error) {
        console.error('Logout error:', error);
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});
```

- [ ] Implement session invalidation on password change

```typescript
// In user password change endpoint
router.post('/change-password', auth, async (req, res) => {
  // ... validate new password ...

  // Update password in Supabase (this invalidates all existing sessions)
  const { error } = await supabase.auth.admin.updateUserById(
    req.user.id,
    { password: newPassword }
  );

  // ... handle response ...
});
```

#### 2.7 Implement JWT Claims Validation

- [ ] Add custom claims validation if needed: `api/src/middleware/auth.ts`

```typescript
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  // ... existing token extraction ...

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Validate custom claims (if any)
  const userMetadata = user.user_metadata;

  // Example: Check if user email is verified
  if (!user.email_confirmed_at) {
    return res.status(403).json({
      error: 'Email not verified',
      message: 'Please verify your email before accessing this resource'
    });
  }

  // Attach user to request
  req.user = user;
  next();
};
```

### Testing JWT Security

- [ ] Test token expiration and refresh flow
- [ ] Test that expired tokens are rejected
- [ ] Test that invalid tokens are rejected
- [ ] Test that logout revokes tokens
- [ ] Test CORS configuration prevents unauthorized origins
- [ ] Test that XSS payloads cannot steal tokens (via input sanitization)
- [ ] Test password change invalidates old sessions

---

## 3. Input Sanitization

**Priority**: CRITICAL
**Estimated Time**: 8-12 hours
**Risk Level**: CRITICAL (without this, application is vulnerable to XSS and injection attacks)

### What is Input Sanitization?

Input sanitization prevents malicious code injection by validating and cleaning user input before processing or storing it.

### Implementation Steps

#### 3.1 Install Validation and Sanitization Libraries

- [ ] Install Zod for schema validation and DOMPurify for HTML sanitization

```bash
cd api
npm install zod

cd ../web
npm install dompurify
npm install --save-dev @types/dompurify
```

#### 3.2 Create Validation Schemas for All Endpoints

- [ ] Create validation schemas directory: `api/src/schemas/`

**Example: User Schema** (`api/src/schemas/user.schema.ts`)

```typescript
import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),

  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),

  emailAddress: z.string()
    .email('Invalid email address')
    .max(100, 'Email must be less than 100 characters'),

  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

**Example: Application Schema** (`api/src/schemas/application.schema.ts`)

```typescript
import { z } from 'zod';

export const createApplicationSchema = z.object({
  scholarshipName: z.string()
    .min(1, 'Scholarship name is required')
    .max(200, 'Scholarship name must be less than 200 characters')
    .trim(),

  organization: z.string()
    .max(200, 'Organization name must be less than 200 characters')
    .trim()
    .optional(),

  minAward: z.number()
    .int('Award must be a whole number')
    .min(0, 'Award cannot be negative')
    .optional(),

  requirements: z.string()
    .max(5000, 'Requirements must be less than 5000 characters')
    .trim()
    .optional(),

  dueDate: z.string()
    .datetime({ message: 'Invalid date format' })
    .or(z.date())
    .optional(),

  applicationLink: z.string()
    .url('Invalid URL')
    .max(500, 'URL must be less than 500 characters')
    .optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
```

#### 3.3 Create Validation Middleware

- [ ] Create validation middleware: `api/src/middleware/validate.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request body
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errorMessages,
        });
      }

      next(error);
    }
  };
};

// For query parameters
export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          error: 'Invalid query parameters',
          details: errorMessages,
        });
      }

      next(error);
    }
  };
};

// For path parameters
export const validateParams = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          error: 'Invalid path parameters',
          details: errorMessages,
        });
      }

      next(error);
    }
  };
};
```

#### 3.4 Apply Validation to All Routes

- [ ] Update routes to use validation middleware

**Example**: `api/src/routes/users.routes.ts`

```typescript
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../schemas/user.schema';
import { updateMyProfile } from '../controllers/users.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.patch(
  '/me',
  auth,
  validate(updateProfileSchema),
  updateMyProfile
);

export default router;
```

**Example**: `api/src/routes/applications.routes.ts`

```typescript
import { Router } from 'express';
import { validate, validateParams } from '../middleware/validate';
import { createApplicationSchema, updateApplicationSchema } from '../schemas/application.schema';
import { createApplication, updateApplication } from '../controllers/applications.controller';
import { auth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID').transform(Number),
});

router.post(
  '/',
  auth,
  validate(createApplicationSchema),
  createApplication
);

router.patch(
  '/:id',
  auth,
  validateParams(idParamSchema),
  validate(updateApplicationSchema),
  updateApplication
);

export default router;
```

#### 3.5 Sanitize HTML Content

- [ ] Create HTML sanitization utility: `api/src/utils/sanitize.ts`

```typescript
import DOMPurify from 'isomorphic-dompurify'; // Server-side compatible

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Strips all HTML tags from content
 */
export const stripHtml = (html: string): string => {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
};

/**
 * Escapes HTML special characters
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};
```

- [ ] Install isomorphic-dompurify for server-side sanitization

```bash
cd api
npm install isomorphic-dompurify
```

#### 3.6 Apply Sanitization in Services

- [ ] Update service methods to sanitize HTML content

```typescript
// Example in essays.service.ts
import { sanitizeHtml } from '../utils/sanitize';

export const createEssay = async (essayData: CreateEssayInput) => {
  // Sanitize rich text content
  if (essayData.content) {
    essayData.content = sanitizeHtml(essayData.content);
  }

  // ... rest of the service logic
};
```

#### 3.7 Frontend Input Sanitization

- [ ] Create sanitization utility: `web/src/utils/sanitize.ts`

```typescript
import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content on the frontend
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
};

/**
 * Display sanitized HTML safely
 */
export const SafeHtml: React.FC<{ html: string }> = ({ html }) => {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
};
```

#### 3.8 Create All Required Schemas

- [ ] Create schemas for all entities:
  - [ ] `user.schema.ts` - User profile updates
  - [ ] `application.schema.ts` - Application CRUD
  - [ ] `essay.schema.ts` - Essay CRUD
  - [ ] `collaborator.schema.ts` - Collaborator management
  - [ ] `collaboration.schema.ts` - Collaboration CRUD
  - [ ] `recommendation.schema.ts` - Recommendation CRUD
  - [ ] `auth.schema.ts` - Registration, login, password reset

### Testing Input Sanitization

- [ ] Test that malicious HTML is sanitized
- [ ] Test that XSS payloads are blocked
- [ ] Test that SQL injection attempts fail
- [ ] Test that valid input passes validation
- [ ] Test that invalid input returns clear error messages
- [ ] Test field length limits
- [ ] Test special character handling

---

## 4. Rate Limiting

**Priority**: HIGH
**Estimated Time**: 3-4 hours
**Risk Level**: MEDIUM (without this, application is vulnerable to brute-force and DoS attacks)

### What is Rate Limiting?

Rate limiting restricts the number of requests a client can make within a time window, preventing abuse, brute-force attacks, and resource exhaustion.

### Implementation Steps

#### 4.1 Install Rate Limiting Package

- [ ] Install express-rate-limit

```bash
cd api
npm install express-rate-limit
```

#### 4.2 Create Rate Limiting Configuration

- [ ] Create rate limit configuration: `api/src/middleware/rateLimiter.ts`

```typescript
import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute-force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
});

/**
 * Moderate rate limiter for general API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Too many password reset attempts. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Lenient rate limiter for read-only operations
 */
export const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Don't count failed requests
});

/**
 * Strict rate limiter for state-changing operations
 */
export const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'Too many write operations. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict limiter for sensitive operations
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    error: 'Rate limit exceeded for sensitive operations.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### 4.3 Apply Rate Limiters to Routes

- [ ] Apply global API rate limiter in `api/src/index.ts`

```typescript
import { apiLimiter } from './middleware/rateLimiter';

// Apply to all API routes
app.use('/api', apiLimiter);
```

- [ ] Apply specific rate limiters to authentication routes

```typescript
// In api/src/routes/auth.routes.ts
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
```

- [ ] Apply rate limiters to other routes based on operation type

```typescript
// In api/src/routes/applications.routes.ts
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';

router.get('/', readLimiter, getApplications);
router.post('/', writeLimiter, createApplication);
router.patch('/:id', writeLimiter, updateApplication);
router.delete('/:id', writeLimiter, deleteApplication);
```

#### 4.4 Configure Redis for Distributed Rate Limiting (Optional)

For production environments with multiple server instances, use Redis for shared rate limiting state.

- [ ] Install Redis rate limit store

```bash
npm install rate-limit-redis ioredis
```

- [ ] Create Redis configuration: `api/src/config/redis.ts`

```typescript
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

- [ ] Update rate limiters to use Redis store

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  // ... rest of config
});
```

#### 4.5 Add Rate Limit Headers to Frontend

- [ ] Display rate limit information to users

```typescript
// In web/src/services/api.ts
api.interceptors.response.use(
  (response) => {
    // Check rate limit headers
    const remaining = response.headers['ratelimit-remaining'];
    const limit = response.headers['ratelimit-limit'];

    if (remaining && Number(remaining) < 10) {
      console.warn(`Rate limit warning: ${remaining}/${limit} requests remaining`);
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 429) {
      // Rate limited
      const retryAfter = error.response.headers['retry-after'];
      console.error(`Rate limited. Retry after ${retryAfter} seconds`);
      // Show user-friendly error message
    }
    return Promise.reject(error);
  }
);
```

#### 4.6 Create Rate Limit Bypass for Trusted IPs (Optional)

- [ ] Add IP whitelist configuration

```typescript
// In rateLimiter.ts
export const createLimiter = (options: any) => {
  return rateLimit({
    ...options,
    skip: (req) => {
      // Skip rate limiting for trusted IPs (e.g., internal services)
      const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
      const clientIP = req.ip || req.connection.remoteAddress;
      return trustedIPs.includes(clientIP || '');
    },
  });
};
```

### Testing Rate Limiting

- [ ] Test that rate limits are enforced
- [ ] Test that 429 status is returned when limit exceeded
- [ ] Test that limits reset after time window
- [ ] Test different limits for different endpoint types
- [ ] Test that rate limit headers are returned
- [ ] Test Redis integration (if using distributed setup)

---

## Implementation Order

Follow this order to maximize security improvements:

### Phase 1: Input Sanitization
**Priority**: CRITICAL - Prevents XSS and injection attacks

1. [ ] Install dependencies (Zod, DOMPurify)
2. [ ] Create validation schemas for all entities
3. [ ] Create validation middleware
4. [ ] Apply validation to all routes (start with auth, then user-facing endpoints)
5. [ ] Create sanitization utilities
6. [ ] Apply sanitization in services
7. [ ] Test thoroughly

### Phase 2: JWT Security
**Priority**: HIGH - Secures token-based authentication

1. [ ] Review and configure secure token storage (sessionStorage vs localStorage)
2. [ ] Implement token refresh error handling
3. [ ] Install and configure Helmet for security headers
4. [ ] Verify and update CORS configuration
5. [ ] Implement server-side logout endpoint
6. [ ] Add JWT claims validation (email verification)
7. [ ] Test thoroughly

### Phase 3: Rate Limiting
**Priority**: HIGH - Prevents brute-force and DoS

1. [ ] Install rate limiting package
2. [ ] Create rate limit configurations
3. [ ] Apply global rate limiter
4. [ ] Apply specific rate limiters to routes
5. [ ] Configure Redis (if needed for production)
6. [ ] Add frontend error handling
7. [ ] Test thoroughly

---

## Testing Strategy

### Unit Tests

- [ ] Test validation schemas with valid/invalid input
- [ ] Test sanitization functions with malicious input
- [ ] Test rate limiter configurations
- [ ] Test JWT token refresh logic

### Integration Tests

- [ ] Test API endpoints reject invalid input
- [ ] Test API endpoints enforce rate limits
- [ ] Test error responses are user-friendly
- [ ] Test that valid requests still work
- [ ] Test token expiration and refresh flow
- [ ] Test logout functionality

### Security Tests

- [ ] Attempt XSS attacks (should be blocked by input sanitization)
- [ ] Attempt SQL injection (should be blocked by input validation)
- [ ] Attempt token theft via XSS (should be mitigated by CSP headers)
- [ ] Attempt brute-force login (should be rate limited)
- [ ] Test with automated security scanner (e.g., OWASP ZAP)
- [ ] Verify CORS policy blocks unauthorized origins

### Manual Testing

- [ ] Test all forms with invalid data
- [ ] Test all forms with valid data
- [ ] Test rate limiting by making rapid requests
- [ ] Test token refresh when access token expires
- [ ] Test error messages are clear and helpful
- [ ] Test logout clears tokens and invalidates session

---

## Deployment Checklist

### Pre-Deployment

- [ ] All validation schemas implemented
- [ ] All routes have validation middleware
- [ ] JWT security measures implemented (token refresh, logout, claims validation)
- [ ] Security headers configured (Helmet with CSP)
- [ ] Rate limiting configured for all endpoint types
- [ ] All tests passing
- [ ] Security scan completed (no critical issues)
- [ ] Documentation updated

### Production Configuration

- [ ] Token storage strategy chosen (sessionStorage vs localStorage)
- [ ] Rate limiting using Redis (for distributed systems)
- [ ] Environment variables properly configured
- [ ] HTTPS enforced (required for secure token transmission)
- [ ] Security headers configured (Helmet.js with strict CSP)
- [ ] CORS properly configured (credentials: false, specific origins)
- [ ] Error messages don't expose sensitive information
- [ ] Supabase token expiration settings verified (1 hour for access tokens)

### Post-Deployment

- [ ] Monitor rate limit metrics
- [ ] Monitor JWT token expiration and refresh patterns
- [ ] Monitor validation error rates
- [ ] Set up alerts for suspicious activity (failed logins, rate limit hits)
- [ ] Review logs for attack attempts
- [ ] Monitor Supabase auth logs for anomalies
- [ ] Conduct penetration testing

---

## Common Pitfalls to Avoid

### Input Sanitization
- ❌ Don't sanitize on frontend only - always validate on backend
- ❌ Don't trust any user input, even from authenticated users
- ❌ Don't use overly permissive validation rules
- ✅ Do validate both input and output
- ✅ Do use strict type checking
- ✅ Do sanitize HTML content before storing

### JWT Security
- ❌ Don't store tokens in localStorage without understanding XSS risks
- ❌ Don't send tokens in URL query parameters (use Authorization headers)
- ❌ Don't skip HTTPS in production (tokens transmitted in clear text)
- ❌ Don't use long-lived access tokens (keep under 1 hour)
- ❌ Don't trust JWT payload without verification (always validate server-side)
- ✅ Do use sessionStorage or memory for more secure token storage
- ✅ Do implement automatic token refresh
- ✅ Do invalidate sessions on password change
- ✅ Do use HTTPS everywhere in production
- ✅ Do validate all JWT claims on the backend

### Rate Limiting
- ❌ Don't use the same limits for all endpoints
- ❌ Don't rate limit by session (use IP address)
- ❌ Don't set limits too high (defeats the purpose)
- ✅ Do use different limits for different operations
- ✅ Do provide clear error messages
- ✅ Do monitor and adjust limits based on usage

---

## Resources

### Documentation
- [Zod Documentation](https://zod.dev/)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### Security Testing Tools
- [OWASP ZAP](https://www.zaproxy.org/) - Security scanner
- [Burp Suite](https://portswigger.net/burp) - Security testing
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency vulnerability scanning

---

## Questions & Answers

**Q: Do we really not need CSRF protection?**
A: Correct! Since we use JWT bearer tokens in Authorization headers (not cookies), browsers don't automatically send credentials cross-origin. CSRF attacks cannot work in this architecture. See Section 1 for detailed explanation.

**Q: Should we implement all security features at once?**
A: No. Follow the implementation order above. Start with Input Sanitization (most critical for preventing XSS), then JWT Security, then Rate Limiting.

**Q: Will this slow down the application?**
A: Minimal impact. Validation adds ~1-5ms per request. Rate limiting adds ~1ms. JWT validation adds ~2-5ms. Security headers add negligible overhead. The security benefits far outweigh the performance cost.

**Q: Do we need Redis for rate limiting?**
A: Only if you have multiple server instances. For a single server, in-memory storage is fine.

**Q: Should we use localStorage or sessionStorage for tokens?**
A: **sessionStorage is more secure** (tokens cleared when tab closes, reducing XSS risk window), but **localStorage has better UX** (persists across tabs/refreshes). Choose based on your security vs. UX priorities. The most secure option is memory-only storage, but requires re-login on every page refresh.

**Q: What if we add mobile apps later?**
A: The same JWT bearer token approach works perfectly for mobile apps. Mobile apps should store tokens in secure storage (Keychain on iOS, Keystore on Android) and send them in Authorization headers just like the web app.

**Q: How do we test security features?**
A: Use the testing strategy above, including automated security scanners (OWASP ZAP), manual penetration testing, and attempting actual attacks (XSS, SQL injection, brute-force) in a test environment.

**Q: What about refresh token security?**
A: Supabase handles refresh token rotation automatically. Refresh tokens are longer-lived but can only be used to get new access tokens, not to access resources directly. Implement server-side logout to revoke refresh tokens when needed.

---

**Last Updated**: 2025-12-30
**Next Review**: After Phase 1 (Input Sanitization) completion

---

## Summary of Changes from Original Plan

**Key Change**: CSRF Protection has been replaced with JWT Security best practices.

**Reason**: This application uses stateless JWT bearer token authentication (via Supabase), not session cookies. According to OWASP guidelines, CSRF protection is not needed when credentials are not automatically sent by the browser. JWT tokens in Authorization headers must be manually added by JavaScript, making CSRF attacks impossible.

**What was removed**: All CSRF middleware, token endpoints, and frontend CSRF handling code.

**What was added**: JWT-specific security measures including secure token storage strategies, token refresh handling, security headers (Helmet/CSP), CORS configuration, server-side logout, and JWT claims validation.

This provides better security tailored to the actual authentication architecture of the application.
