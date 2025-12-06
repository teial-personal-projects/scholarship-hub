/**
 * Tests for collaborations service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollaborations } from '../test/fixtures/collaborations.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('collaborations.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCollaborationsByApplicationId', () => {
    it('should return all collaborations for an application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getCollaborationsByApplicationId } = await import('./collaborations.service.js');

      const mockAppCollabs = [
        mockCollaborations.recommendationPending,
        mockCollaborations.recommendationInvited,
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockAppCollabs,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getCollaborationsByApplicationId(1, 1);

      expect(result).toEqual(mockAppCollabs);
    });
  });

  describe('getCollaborationById', () => {
    it('should return a single collaboration by ID', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getCollaborationById } = await import('./collaborations.service.js');

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

      const result = await getCollaborationById(1, 1);

      expect(result).toEqual(mockCollaborations.recommendationPending);
    });
  });

  describe('createCollaboration', () => {
    it('should create a recommendation collaboration', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createCollaboration } = await import('./collaborations.service.js');

      const newCollab = {
        collaboratorId: 1,
        applicationId: 1,
        collaborationType: 'recommendation',
        status: 'pending',
        portalUrl: 'https://portal.example.com',
      };

      const createdCollab = { ...mockCollaborations.recommendationPending, ...newCollab };

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

      const result = await createCollaboration(1, newCollab);

      expect(result).toBeDefined();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should create an essay review collaboration with essay_id', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createCollaboration } = await import('./collaborations.service.js');

      const newCollab = {
        collaboratorId: 1,
        applicationId: 1,
        essayId: 1,
        collaborationType: 'essayReview',
        status: 'pending',
      };

      const createdCollab = { ...mockCollaborations.essayReviewPending, ...newCollab };

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

      const result = await createCollaboration(1, newCollab);

      expect(result).toBeDefined();
    });

    it('should create a guidance collaboration with session details', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createCollaboration } = await import('./collaborations.service.js');

      const newCollab = {
        collaboratorId: 2,
        applicationId: 1,
        collaborationType: 'guidance',
        status: 'pending',
        sessionType: 'one-on-one',
        meetingUrl: 'https://zoom.us/meeting',
      };

      const createdCollab = { ...mockCollaborations.guidancePending, ...newCollab };

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

      const result = await createCollaboration(1, newCollab);

      expect(result).toBeDefined();
    });
  });

  describe('updateCollaboration', () => {
    it('should update collaboration status', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateCollaboration } = await import('./collaborations.service.js');

      const updates = { status: 'in_progress' };
      const updatedCollab = { ...mockCollaborations.recommendationPending, status: 'in_progress' };

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

      const result = await updateCollaboration(1, 1, updates);

      expect(result).toEqual(updatedCollab);
    });
  });

  describe('addCollaborationHistory', () => {
    it('should add a history entry for a collaboration', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { addCollaborationHistory } = await import('./collaborations.service.js');

      const historyEntry = {
        collaborationId: 1,
        action: 'invited',
        details: 'Invitation sent to collaborator',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: historyEntry,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await addCollaborationHistory(historyEntry);

      expect(result).toEqual(historyEntry);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('getCollaborationHistory', () => {
    it('should return collaboration history', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getCollaborationHistory } = await import('./collaborations.service.js');

      const mockHistory = [
        { id: 1, collaboration_id: 1, action: 'created', details: 'Collaboration created' },
        { id: 2, collaboration_id: 1, action: 'invited', details: 'Invitation sent' },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockHistory,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getCollaborationHistory(1);

      expect(result).toEqual(mockHistory);
    });
  });
});
