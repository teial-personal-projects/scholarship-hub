/**
 * Integration tests for collaborators routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, authenticatedRequest } from '../test/helpers/test-server.js';
import { mockCollaborators } from '../test/fixtures/collaborators.fixture.js';
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

describe('Collaborators Routes', () => {
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

  describe('GET /api/collaborators', () => {
    it('should return list of user collaborators when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockCollaborators.teacher, mockCollaborators.counselor],
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborators');

      expect(response.status).toBe(401);
    });

    it('should enforce relationship validation - only return user own collaborators', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockCollaborators.teacher], // Only user_id: 1
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators');

      expect(response.status).toBe(200);
      // Verify all returned collaborators belong to user
      response.body.forEach((collab: any) => {
        expect(collab.userId).toBe(1);
      });
    });
  });

  describe('POST /api/collaborators', () => {
    it('should create new collaborator when authenticated', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const newCollaborator = {
        name: 'Dr. New Teacher',
        emailAddress: 'newteacher@school.edu',
        relationship: 'Teacher',
        phoneNumber: '+1234567890',
      };

      const createdCollaborator = {
        ...mockCollaborators.teacher,
        ...newCollaborator,
        id: 10,
        user_id: 1,
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdCollaborator,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborators')
        .send(newCollaborator);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', newCollaborator.name);
    });

    it('should return 400 for invalid input', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborators')
        .send({
          // Missing required fields
          name: '',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should validate relationship - return 400 for invalid relationship', async () => {
      await setupAuth();

      const response = await authenticatedRequest(agent, 'valid-token')
        .post('/api/collaborators')
        .send({
          name: 'Test',
          emailAddress: 'test@example.com',
          relationship: 'InvalidRelationship', // Invalid relationship type
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.post('/api/collaborators').send({
        name: 'Test',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/collaborators/:id', () => {
    it('should return collaborator details when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCollaborators.teacher,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent collaborator', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators/999');

      expect(response.status).toBe(404);
    });

    it('should enforce relationship validation - return 404 for other user collaborator', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').get('/api/collaborators/4'); // user_id: 2

      expect([404, 403]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/collaborators/1');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/collaborators/:id', () => {
    it('should update collaborator when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const updatedCollaborator = {
        ...mockCollaborators.teacher,
        name: 'Updated Name',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedCollaborator,
                error: null,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token')
        .patch('/api/collaborators/1')
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Name');
    });

    it('should return 404 for non-existent collaborator', async () => {
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
        .patch('/api/collaborators/999')
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.patch('/api/collaborators/1').send({ name: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/collaborators/:id', () => {
    it('should delete collaborator when authenticated and owner', async () => {
      await setupAuth();
      const { supabase } = await import('../config/supabase.js');

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCollaborators.teacher,
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
        if (table === 'collaborators') {
          return {
            select: mockSelect,
            delete: mockDelete,
          };
        }
        return { select: mockSelect };
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborators/1');

      expect([200, 204]).toContain(response.status);
    });

    it('should return 404 for non-existent collaborator', async () => {
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

      const response = await authenticatedRequest(agent, 'valid-token').delete('/api/collaborators/999');

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await agent.delete('/api/collaborators/1');

      expect(response.status).toBe(401);
    });
  });
});

