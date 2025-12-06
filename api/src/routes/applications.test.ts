/**
 * Integration tests for applications routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockApplications } from '../test/fixtures/applications.fixture.js';
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

describe('Applications Routes', () => {
  const app = createTestApp();
  const agent = request(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const setupAuth = async () => {
    const { supabase } = await import('../config/supabase.js');
    const { getUserProfileByAuthId } = await import('../utils/supabase.js');

    vi.mocked(supabase.auth.getUser).mockResolvedValue(
      mockSupabaseAuth.getUser({ id: 'auth-user-1', email: 'student1@example.com' })
    );
    vi.mocked(getUserProfileByAuthId).mockResolvedValue(mockUsers.student1);
  };

  describe('GET /api/applications', () => {
    it('should return list of user applications when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      // Mock applications query
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [mockApplications.inProgress, mockApplications.submitted],
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should support pagination with limit and offset', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [mockApplications.inProgress],
                error: null,
                count: 5,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/applications?limit=1&offset=0'
      );

      expect(response.status).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/applications');

      expect(response.status).toBe(401);
    });

    it('should enforce RLS - only return user own applications', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      // Mock query that only returns user's own applications
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [mockApplications.inProgress], // Only user_id: 1
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications');

      expect(response.status).toBe(200);
      // Verify all returned applications belong to user
      response.body.forEach((app: any) => {
        expect(app.userId).toBe(1);
      });
    });
  });

  describe('POST /api/applications', () => {
    it('should create new application when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const newApplication = {
        scholarshipName: 'New Scholarship',
        organization: 'New Org',
        amount: 3000,
        deadline: '2024-12-31',
        status: 'In Progress',
      };

      const createdApp = {
        ...mockApplications.inProgress,
        ...newApplication,
        id: 10,
        user_id: 1,
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdApp,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications')
        .send(newApplication);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('scholarshipName', newApplication.scholarshipName);
    });

    it('should return 400 for invalid input', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications')
        .send({
          // Missing required fields
          scholarshipName: '',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/applications').send({
        scholarshipName: 'Test',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/applications/:id', () => {
    it('should return application details when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockApplications.inProgress,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent application', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications/999');

      expect(response.status).toBe(404);
    });

    it('should enforce RLS - return 404 for other user application', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      // Mock query that returns null (application belongs to different user)
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

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/applications/4'); // user_id: 2

      expect([404, 403]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/applications/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/applications/:id', () => {
    it('should update application when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const updatedApp = {
        ...mockApplications.inProgress,
        scholarship_name: 'Updated Scholarship',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedApp,
                error: null,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/applications/1')
        .send({
          scholarshipName: 'Updated Scholarship',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scholarshipName', 'Updated Scholarship');
    });

    it('should return 404 for non-existent application', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/applications/999')
        .send({ scholarshipName: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/applications/1').send({ scholarshipName: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/applications/:id', () => {
    it('should delete application when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      // First check if application exists
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockApplications.inProgress,
            error: null,
          }),
        }),
      });

      // Then delete
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'applications') {
          return {
            select: mockSelect,
            delete: mockDelete,
          };
        }
        return { select: mockSelect };
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/applications/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent application', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

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

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/applications/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/applications/1');

      expect(response.status).toBe(401);
    });
  });
});

