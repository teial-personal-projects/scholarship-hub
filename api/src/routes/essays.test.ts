/**
 * Integration tests for essays routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockEssays } from '../test/fixtures/essays.fixture.js';
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

describe('Essays Routes', () => {
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

  describe('GET /api/applications/:applicationId/essays', () => {
    it('should return essays for an application when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      // Mock application check
      const mockFrom = vi.fn((table: string) => {
        if (table === 'applications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockApplications.inProgress,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'essays') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [mockEssays.personalStatement, mockEssays.communityService],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/applications/1/essays'
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 when application does not exist', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').get(
        '/api/applications/999/essays'
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/applications/1/essays');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/applications/:applicationId/essays', () => {
    it('should create new essay for an application when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const newEssay = {
        title: 'New Essay',
        prompt: 'Write about your goals',
        content: 'This is my essay content',
        wordCount: 500,
      };

      const createdEssay = {
        ...mockEssays.personalStatement,
        ...newEssay,
        id: 10,
        application_id: 1,
        user_id: 1,
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'applications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockApplications.inProgress,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'essays') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createdEssay,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications/1/essays')
        .send(newEssay);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', newEssay.title);
    });

    it('should return 400 for invalid input', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/applications/1/essays')
        .send({
          // Missing required fields
          title: '',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/applications/1/essays').send({
        title: 'Test Essay',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/essays/:id', () => {
    it('should return essay details when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockEssays.personalStatement,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/essays/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent essay', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/essays/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/essays/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/essays/:id', () => {
    it('should update essay when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const updatedEssay = {
        ...mockEssays.personalStatement,
        title: 'Updated Essay Title',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedEssay,
                error: null,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/essays/1')
        .send({
          title: 'Updated Essay Title',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Updated Essay Title');
    });

    it('should return 404 for non-existent essay', async () => {
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
        .patch('/api/essays/999')
        .send({ title: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/essays/1').send({ title: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/essays/:id', () => {
    it('should delete essay when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEssays.personalStatement,
            error: null,
          }),
        }),
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'essays') {
          return {
            select: mockSelect,
            delete: mockDelete,
          };
        }
        return { select: mockSelect };
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/essays/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent essay', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/essays/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/essays/1');

      expect(response.status).toBe(401);
    });
  });
});

