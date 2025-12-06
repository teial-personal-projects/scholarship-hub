/**
 * Tests for collaborators service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollaborators } from '../test/fixtures/collaborators.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('collaborators.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserCollaborators', () => {
    it('should return all collaborators for a user', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserCollaborators } = await import('./collaborators.service.js');

      const mockUserCollabs = [
        mockCollaborators.teacher,
        mockCollaborators.counselor,
        mockCollaborators.mentor,
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockUserCollabs,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserCollaborators(1);

      expect(result).toEqual(mockUserCollabs);
    });
  });

  describe('getCollaboratorById', () => {
    it('should return a single collaborator by ID', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getCollaboratorById } = await import('./collaborators.service.js');

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

      const result = await getCollaboratorById(1, 1);

      expect(result).toEqual(mockCollaborators.teacher);
    });
  });

  describe('createCollaborator', () => {
    it('should create a new collaborator', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createCollaborator } = await import('./collaborators.service.js');

      const newCollab = {
        name: 'New Teacher',
        emailAddress: 'newteacher@school.edu',
        relationship: 'Teacher',
      };

      const createdCollab = { ...mockCollaborators.teacher, ...newCollab };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdCollab,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createCollaborator(1, newCollab);

      expect(result).toEqual(createdCollab);
    });
  });

  describe('updateCollaborator', () => {
    it('should update an existing collaborator', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateCollaborator } = await import('./collaborators.service.js');

      const updates = { phoneNumber: '+1111111111', notes: 'Updated notes' };
      const updatedCollab = { ...mockCollaborators.teacher, ...updates };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedCollab,
              error: null,
            }),
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateCollaborator(1, 1, updates);

      expect(result).toEqual(updatedCollab);
    });
  });

  describe('deleteCollaborator', () => {
    it('should delete a collaborator', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { deleteCollaborator } = await import('./collaborators.service.js');

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await deleteCollaborator(1, 1);

      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
