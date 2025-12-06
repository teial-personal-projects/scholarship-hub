/**
 * Integration tests for users routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
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

describe('Users Routes', () => {
  const app = createTestApp();
  const agent = request(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile when authenticated', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      // Mock auth middleware
      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
      );
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      // Mock user profile query
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

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/users/me');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('emailAddress');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when token is invalid', async () => {
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

      const response = await authenticatedRequest(agent, 'invalid-token').get('/api/users/me');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update current user profile when authenticated', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      // Mock auth
      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
      );
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      // Mock update query
      const updatedUser = { ...mockUsers.student1, first_name: 'Updated', last_name: 'Name' };
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedUser,
                error: null,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/users/me')
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('firstName', 'Updated');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/users/me').send({ firstName: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid input', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
      );
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/users/me')
        .send({
          emailAddress: 'invalid-email', // Invalid email format
        });

      // Should return 400 or 422 for validation error
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/users/me/search-preferences', () => {
    it('should return search preferences when authenticated as student', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      // Mock auth
      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-3', email: 'student3@example.com' })
      );
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.withSearchPreferences);

      // Mock search preferences query
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUsers.withSearchPreferences.search_preferences,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/users/me/search-preferences'
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('targetType');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/users/me/search-preferences');

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not a student', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfileByAuthId } = await import('../utils/supabase.js');

      // Mock auth with non-student user (no role or different role)
      vi.mocked(supabase.auth.getUser).mockResolvedValue(
        mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'user@example.com' })
      );
      const nonStudentUser = { ...mockUsers.student1, role: 'admin' };
      vi.mocked(getUserProfileByAuthId).mockResolvedValue(nonStudentUser);

      // Mock role check to return false
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/users/me/search-preferences'
      );

      // Should return 403 if role check fails
      expect([403, 404]).toContain(response.status);
    });
  });
});

