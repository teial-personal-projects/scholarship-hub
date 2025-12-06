/**
 * Tests for essays service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockEssays } from '../test/fixtures/essays.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('essays.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEssaysByApplication', () => {
    it('should return all essays for an application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getEssaysByApplication } = await import('./essays.service.js');

      const mockAppEssays = [mockEssays.personalStatement, mockEssays.draft];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockAppEssays,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getEssaysByApplication(1, 1);

      expect(result).toEqual(mockAppEssays);
    });
  });

  describe('getEssayById', () => {
    it('should return a single essay by ID', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getEssayById } = await import('./essays.service.js');

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

      const result = await getEssayById(1, 1);

      expect(result).toEqual(mockEssays.personalStatement);
    });
  });

  describe('createEssay', () => {
    it('should create a new essay', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createEssay } = await import('./essays.service.js');

      const newEssay = {
        applicationId: 1,
        title: 'New Essay',
        prompt: 'Test prompt',
        content: 'Test content',
      };

      const createdEssay = { ...mockEssays.personalStatement, ...newEssay };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdEssay,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createEssay(1, newEssay);

      expect(result).toEqual(createdEssay);
    });
  });

  describe('updateEssay', () => {
    it('should update an existing essay', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateEssay } = await import('./essays.service.js');

      const updates = { content: 'Updated content', wordCount: 550 };
      const updatedEssay = { ...mockEssays.personalStatement, ...updates };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedEssay,
              error: null,
            }),
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateEssay(1, 1, updates);

      expect(result).toEqual(updatedEssay);
    });
  });

  describe('deleteEssay', () => {
    it('should delete an essay', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { deleteEssay } = await import('./essays.service.js');

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

      await deleteEssay(1, 1);

      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
