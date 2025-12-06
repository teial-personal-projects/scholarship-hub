/**
 * Integration tests for collaborations routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockCollaborations } from '../test/fixtures/collaborations.fixture.js';
import { mockCollaborators } from '../test/fixtures/collaborators.fixture.js';
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

describe('Collaborations Routes', () => {
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

  describe('POST /api/collaborations', () => {
    it('should create recommendation collaboration when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const newCollaboration = {
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'recommendation',
        notes: 'Need recommendation letter',
      };

      const createdCollaboration = {
        ...mockCollaborations.recommendationPending,
        ...newCollaboration,
        id: 10,
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCollaborators.teacher,
                  error: null,
                }),
              }),
            }),
          };
        }
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
        if (table === 'collaborations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createdCollaboration,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'recommendation_collaborations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { collaboration_id: 10, portal_url: null },
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
        .post('/api/collaborations')
        .send(newCollaboration);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('collaborationType', 'recommendation');
    });

    it('should create essay review collaboration when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const newCollaboration = {
        collaboratorId: 1,
        applicationId: 1,
        essayId: 1,
        collaborationType: 'essayReview',
        notes: 'Need essay review',
      };

      const createdCollaboration = {
        ...mockCollaborations.essayReviewPending,
        ...newCollaboration,
        id: 11,
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCollaborators.teacher,
                  error: null,
                }),
              }),
            }),
          };
        }
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
        if (table === 'collaborations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createdCollaboration,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'essay_review_collaborations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { collaboration_id: 11, essay_id: 1 },
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
        .post('/api/collaborations')
        .send(newCollaboration);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('collaborationType', 'essayReview');
    });

    it('should create guidance collaboration when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const newCollaboration = {
        collaboratorId: 2,
        applicationId: 1,
        collaborationType: 'guidance',
        notes: 'Need guidance session',
      };

      const createdCollaboration = {
        ...mockCollaborations.guidancePending,
        ...newCollaboration,
        id: 12,
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCollaborators.counselor,
                  error: null,
                }),
              }),
            }),
          };
        }
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
        if (table === 'collaborations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createdCollaboration,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'guidance_collaborations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { collaboration_id: 12, scheduled_date: null },
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
        .post('/api/collaborations')
        .send(newCollaboration);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('collaborationType', 'guidance');
    });

    it('should return 400 for invalid collaboration type', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborations')
        .send({
          collaboratorId: 1,
          applicationId: 1,
          collaborationType: 'invalidType',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/collaborations').send({
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'recommendation',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/collaborations/:id', () => {
    it('should return collaboration details when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCollaborations.recommendationPending,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborations/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent collaboration', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborations/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborations/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/collaborations/:id', () => {
    it('should update collaboration status when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const updatedCollaboration = {
        ...mockCollaborations.recommendationPending,
        status: 'invited',
        awaiting_action_from: 'collaborator',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedCollaboration,
                error: null,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/collaborations/1')
        .send({
          status: 'invited',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'invited');
    });

    it('should track status transitions', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const updatedCollaboration = {
        ...mockCollaborations.recommendationPending,
        status: 'in_progress',
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborations') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedCollaboration,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'collaboration_history') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    collaboration_id: 1,
                    status: 'in_progress',
                    notes: 'Status updated',
                  },
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
        .patch('/api/collaborations/1')
        .send({
          status: 'in_progress',
        });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent collaboration', async () => {
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
        .patch('/api/collaborations/999')
        .send({ status: 'invited' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/collaborations/1').send({ status: 'invited' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/collaborations/:id/history', () => {
    it('should return collaboration history when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockHistory = [
        {
          id: 1,
          collaboration_id: 1,
          status: 'pending',
          notes: 'Created',
          created_at: '2024-01-10T00:00:00Z',
        },
        {
          id: 2,
          collaboration_id: 1,
          status: 'invited',
          notes: 'Invitation sent',
          created_at: '2024-01-12T00:00:00Z',
        },
      ];

      const mockFrom = vi.fn((table: string) => {
        if (table === 'collaborations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCollaborations.recommendationPending,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'collaboration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockHistory,
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
        '/api/collaborations/1/history'
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborations/1/history');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/collaborations/:id', () => {
    it('should delete collaboration when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCollaborations.recommendationPending,
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
        if (table === 'collaborations') {
          return {
            select: mockSelect,
            delete: mockDelete,
          };
        }
        return { select: mockSelect };
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborations/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent collaboration', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborations/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/collaborations/1');

      expect(response.status).toBe(401);
    });
  });
});

