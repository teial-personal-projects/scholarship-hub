/**
 * Integration tests for auth routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../test/helpers/test-server.js';
import { mockUsers } from '../test/fixtures/users.fixture.js';
import { createMockSupabaseClient } from '../test/helpers/supabase-mock.js';
import { mockSupabaseAuth } from '../test/helpers/auth-mock.js';

// Mock Supabase
vi.mock('../config/supabase.js', () => ({
  supabase: createMockSupabaseClient(),
}));

// Mock utils
vi.mock('../utils/supabase.js', () => ({
  getUserProfileByAuthId: vi.fn(),
}));

describe('Auth Routes', () => {
  const app = createTestApp();
  const agent = request(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
      };

      // Mock Supabase sign up
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: 'new-auth-user-id',
            email: registrationData.email,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: {
              id: 'new-auth-user-id',
              email: registrationData.email,
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            },
          },
        },
        error: null,
      });

      // Mock user profile creation
      const newUser = {
        ...mockUsers.student1,
        id: 10,
        auth_user_id: 'new-auth-user-id',
        email_address: registrationData.email,
        first_name: registrationData.firstName,
        last_name: registrationData.lastName,
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: newUser,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      // Mock getUserProfileByAuthId for subsequent calls
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(newUser);

      const response = await agent.post('/api/auth/register').send(registrationData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
    });

    it('should return 400 for invalid email', async () => {
      const response = await agent.post('/api/auth/register').send({
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 for weak password', async () => {
      const response = await agent.post('/api/auth/register').send({
        email: 'test@example.com',
        password: '123', // Too weak
        firstName: 'Test',
        lastName: 'User',
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await agent.post('/api/auth/register').send({
        email: 'test@example.com',
        // Missing password, firstName, lastName
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      const loginData = {
        email: 'student1@example.com',
        password: 'SecurePassword123!',
      };

      // Mock Supabase sign in
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: {
            id: 'auth-user-1',
            email: loginData.email,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: {
              id: 'auth-user-1',
              email: loginData.email,
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            },
          },
        },
        error: null,
      });

      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      const response = await agent.post('/api/auth/login').send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
    });

    it('should return 401 for invalid credentials', async () => {
      const { supabase } = await import('../config/supabase.js');

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'Invalid login credentials',
          status: 400,
          code: 'AUTH_ERROR',
          __isAuthError: true,
          name: 'AuthError',
        } as any,
      });

      const response = await agent.post('/api/auth/login').send({
        email: 'student1@example.com',
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing email or password', async () => {
      const response = await agent.post('/api/auth/login').send({
        email: 'student1@example.com',
        // Missing password
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const { supabase } = await import('../config/supabase.js');

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      const response = await agent.post('/api/auth/logout');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      const refreshData = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock Supabase refresh session
      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: {
              id: 'auth-user-1',
              email: 'student1@example.com',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            },
          },
          user: {
            id: 'auth-user-1',
            email: 'student1@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      });

      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      const response = await agent.post('/api/auth/refresh').send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session');
    });

    it('should return 401 for invalid refresh token', async () => {
      const { supabase } = await import('../config/supabase.js');

      vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
        data: {
          session: null,
          user: null,
        },
        error: {
          message: 'Invalid refresh token',
          status: 401,
          code: 'AUTH_ERROR',
          __isAuthError: true,
          name: 'AuthError',
        } as any,
      });

      const response = await agent.post('/api/auth/refresh').send({
        refreshToken: 'invalid-refresh-token',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await agent.post('/api/auth/refresh').send({});

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access to protected routes with valid token', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
      );
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUsers.student1,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await agent
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });

    it('should deny access to protected routes without token', async () => {
      const response = await agent.get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should deny access to protected routes with invalid token', async () => {
      const { supabase } = await import('../config/supabase.js');

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: {
          message: 'Invalid token',
          status: 401,
          code: 'AUTH_ERROR',
          __isAuthError: true,
          name: 'AuthError',
        } as any,
      });

      const response = await agent
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should deny access to protected routes with expired token', async () => {
      const { supabase } = await import('../config/supabase.js');

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: {
          message: 'Token expired',
          status: 401,
          code: 'AUTH_ERROR',
          __isAuthError: true,
          name: 'AuthError',
        } as any,
      });

      const response = await agent
        .get('/api/users/me')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
    });
  });
});

