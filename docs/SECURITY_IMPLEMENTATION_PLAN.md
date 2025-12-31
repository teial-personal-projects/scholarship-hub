# Security Implementation Plan

**Last Updated**: 2025-12-30

This document provides a detailed implementation plan for the three critical security features identified in the application architecture: CSRF Protection, Input Sanitization, and Rate Limiting.

---

## Table of Contents

1. [CSRF Protection](#1-csrf-protection)
2. [Input Sanitization](#2-input-sanitization)
3. [Rate Limiting](#3-rate-limiting)
4. [Implementation Order](#implementation-order)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Checklist](#deployment-checklist)

---

## 1. CSRF Protection

**Priority**: HIGH
**Estimated Time**: 4-6 hours
**Risk Level**: HIGH (without this, application is vulnerable to CSRF attacks)

### What is CSRF?

Cross-Site Request Forgery (CSRF) is an attack that tricks authenticated users into executing unwanted actions on a web application. Without CSRF protection, an attacker could craft malicious requests that appear to come from legitimate users.

### Implementation Steps

#### 1.1 Install CSRF Middleware

- [ ] Install the `csurf` package (or `csrf` for newer implementations)

```bash
cd api
npm install csurf cookie-parser
```

**Alternative** (for newer Node versions):
```bash
npm install @edge-csrf/core @edge-csrf/express
```

#### 1.2 Configure CSRF Middleware in Express

- [ ] Create CSRF configuration file: `api/src/middleware/csrf.ts`

```typescript
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// CSRF protection middleware
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
});

// Alternative using @edge-csrf (recommended for modern apps):
// import { createCsrfProtect } from '@edge-csrf/express';
//
// export const csrfProtection = createCsrfProtect({
//   cookie: {
//     name: '__Host-csrf',
//     httpOnly: true,
//     secure: true,
//     sameSite: 'strict',
//   },
// });
```

#### 1.3 Add CSRF Middleware to Express App

- [ ] Update `api/src/index.ts` to include CSRF middleware

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { csrfProtection } from './middleware/csrf';

const app = express();

// Add cookie parser before CSRF
app.use(cookieParser());

// Apply CSRF protection to state-changing routes
// Exclude it from public routes (login, register) initially
app.use(csrfProtection);

// ... rest of your middleware
```

#### 1.4 Create CSRF Token Endpoint

- [ ] Add endpoint to get CSRF token: `api/src/routes/csrf.routes.ts`

```typescript
import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/csrf-token
router.get('/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: req.csrfToken() });
});

export default router;
```

- [ ] Register the route in `api/src/routes/index.ts`

```typescript
import csrfRoutes from './csrf.routes';

router.use('/', csrfRoutes);
```

#### 1.5 Update Frontend to Handle CSRF Tokens

- [ ] Update API service to fetch and include CSRF token: `web/src/services/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Important: enables cookies
});

// Fetch CSRF token on app initialization
let csrfToken: string | null = null;

export const initializeCsrf = async () => {
  try {
    const response = await api.get('/api/csrf-token');
    csrfToken = response.data.csrfToken;

    // Add CSRF token to all state-changing requests
    api.interceptors.request.use((config) => {
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
      return config;
    });
  } catch (error) {
    console.error('Failed to initialize CSRF protection:', error);
  }
};

// Call this when the app loads
export default api;
```

- [ ] Initialize CSRF in `web/src/main.tsx` or `web/src/App.tsx`

```typescript
import { initializeCsrf } from './services/api';

// In App component or main.tsx
useEffect(() => {
  initializeCsrf();
}, []);
```

#### 1.6 Handle CSRF Token Expiration

- [ ] Add error handling for expired CSRF tokens

```typescript
// In api.ts interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'EBADCSRFTOKEN') {
      // Token expired, refresh it
      await initializeCsrf();
      // Retry the original request
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

#### 1.7 Exclude Public Endpoints from CSRF

- [ ] Configure CSRF to skip public authentication endpoints

```typescript
// In api/src/index.ts
import { csrfProtection } from './middleware/csrf';

// Skip CSRF for public routes
const csrfExemptRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'];

app.use((req, res, next) => {
  if (csrfExemptRoutes.includes(req.path)) {
    return next();
  }
  csrfProtection(req, res, next);
});
```

### Testing CSRF Protection

- [ ] Test that requests without CSRF token are rejected
- [ ] Test that requests with valid CSRF token succeed
- [ ] Test that token refresh works on expiration
- [ ] Test that public routes work without CSRF token

---

## 2. Input Sanitization

**Priority**: CRITICAL
**Estimated Time**: 8-12 hours
**Risk Level**: CRITICAL (without this, application is vulnerable to XSS and injection attacks)

### What is Input Sanitization?

Input sanitization prevents malicious code injection by validating and cleaning user input before processing or storing it.

### Implementation Steps

#### 2.1 Install Validation and Sanitization Libraries

- [ ] Install Zod for schema validation and DOMPurify for HTML sanitization

```bash
cd api
npm install zod

cd ../web
npm install dompurify
npm install --save-dev @types/dompurify
```

#### 2.2 Create Validation Schemas for All Endpoints

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

#### 2.3 Create Validation Middleware

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

#### 2.4 Apply Validation to All Routes

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

#### 2.5 Sanitize HTML Content

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

#### 2.6 Apply Sanitization in Services

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

#### 2.7 Frontend Input Sanitization

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

#### 2.8 Create All Required Schemas

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

## 3. Rate Limiting

**Priority**: HIGH
**Estimated Time**: 3-4 hours
**Risk Level**: MEDIUM (without this, application is vulnerable to brute-force and DoS attacks)

### What is Rate Limiting?

Rate limiting restricts the number of requests a client can make within a time window, preventing abuse, brute-force attacks, and resource exhaustion.

### Implementation Steps

#### 3.1 Install Rate Limiting Package

- [ ] Install express-rate-limit

```bash
cd api
npm install express-rate-limit
```

#### 3.2 Create Rate Limiting Configuration

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

#### 3.3 Apply Rate Limiters to Routes

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

#### 3.4 Configure Redis for Distributed Rate Limiting (Optional)

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

#### 3.5 Add Rate Limit Headers to Frontend

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

#### 3.6 Create Rate Limit Bypass for Trusted IPs (Optional)

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

### Phase 1: Input Sanitization (Week 1)
**Priority**: CRITICAL - Prevents XSS and injection attacks

1. [ ] Install dependencies (Zod, DOMPurify)
2. [ ] Create validation schemas for all entities
3. [ ] Create validation middleware
4. [ ] Apply validation to all routes (start with auth, then user-facing endpoints)
5. [ ] Create sanitization utilities
6. [ ] Apply sanitization in services
7. [ ] Test thoroughly

### Phase 2: CSRF Protection (Week 2)
**Priority**: HIGH - Prevents cross-site request forgery

1. [ ] Install CSRF middleware
2. [ ] Configure CSRF in Express
3. [ ] Create CSRF token endpoint
4. [ ] Update frontend to handle CSRF tokens
5. [ ] Handle token expiration
6. [ ] Exclude public endpoints
7. [ ] Test thoroughly

### Phase 3: Rate Limiting (Week 2)
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

### Integration Tests

- [ ] Test API endpoints reject invalid input
- [ ] Test API endpoints reject requests without CSRF token
- [ ] Test API endpoints enforce rate limits
- [ ] Test error responses are user-friendly
- [ ] Test that valid requests still work

### Security Tests

- [ ] Attempt XSS attacks (should be blocked)
- [ ] Attempt SQL injection (should be blocked)
- [ ] Attempt CSRF attacks (should be blocked)
- [ ] Attempt brute-force login (should be rate limited)
- [ ] Test with automated security scanner (e.g., OWASP ZAP)

### Manual Testing

- [ ] Test all forms with invalid data
- [ ] Test all forms with valid data
- [ ] Test rate limiting by making rapid requests
- [ ] Test CSRF token refresh
- [ ] Test error messages are clear and helpful

---

## Deployment Checklist

### Pre-Deployment

- [ ] All validation schemas implemented
- [ ] All routes have validation middleware
- [ ] CSRF protection enabled for all state-changing endpoints
- [ ] Rate limiting configured for all endpoint types
- [ ] All tests passing
- [ ] Security scan completed (no critical issues)
- [ ] Documentation updated

### Production Configuration

- [ ] CSRF secure cookies enabled (`secure: true`)
- [ ] Rate limiting using Redis (for distributed systems)
- [ ] Environment variables properly configured
- [ ] HTTPS enforced
- [ ] Security headers configured (Helmet.js)
- [ ] Error messages don't expose sensitive information

### Post-Deployment

- [ ] Monitor rate limit metrics
- [ ] Monitor CSRF token failures
- [ ] Monitor validation error rates
- [ ] Set up alerts for suspicious activity
- [ ] Review logs for attack attempts
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

### CSRF Protection
- ❌ Don't use GET requests for state-changing operations
- ❌ Don't expose CSRF tokens in URLs
- ❌ Don't disable CSRF for convenience
- ✅ Do use secure, httpOnly cookies
- ✅ Do implement token rotation
- ✅ Do test with actual CSRF attack scenarios

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
- [CSRF Protection Guide](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

### Security Testing Tools
- [OWASP ZAP](https://www.zaproxy.org/) - Security scanner
- [Burp Suite](https://portswigger.net/burp) - Security testing
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency vulnerability scanning

---

## Questions & Answers

**Q: Should we implement all three at once?**
A: No. Follow the implementation order above. Start with Input Sanitization (most critical), then CSRF, then Rate Limiting.

**Q: Will this slow down the application?**
A: Minimal impact. Validation adds ~1-5ms per request. Rate limiting adds ~1ms. CSRF adds ~2ms. The security benefits far outweigh the negligible performance cost.

**Q: Do we need Redis for rate limiting?**
A: Only if you have multiple server instances. For a single server, in-memory storage is fine.

**Q: What if we have mobile apps?**
A: Mobile apps need special CSRF handling (token-based instead of cookie-based). Rate limiting works the same.

**Q: How do we test security features?**
A: Use the testing strategy above, including automated security scanners and manual penetration testing.

---

**Last Updated**: 2025-12-30
**Next Review**: After Phase 1 completion
