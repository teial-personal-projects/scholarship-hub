/**
 * Tests for applications service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockApplications } from '../test/fixtures/applications.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('applications.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserApplications', () => {
    it('should return all applications for a user', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserApplications } = await import('./applications.service.js');

      const mockApps = [mockApplications.inProgress, mockApplications.submitted];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockApps,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserApplications(1);

      expect(result).toEqual(mockApps);
      expect(mockFrom).toHaveBeenCalledWith('applications');
    });
  });

  describe('getApplicationById', () => {
    it('should return a single application by ID', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getApplicationById } = await import('./applications.service.js');

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

      const result = await getApplicationById(1, 1);

      expect(result).toEqual(mockApplications.inProgress);
    });

    it('should throw error if application not found', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getApplicationById } = await import('./applications.service.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found', code: 'PGRST116' },
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await expect(getApplicationById(999, 1)).rejects.toThrow();
    });
  });

  describe('createApplication', () => {
    it('should create a new application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { createApplication } = await import('./applications.service.js');

      const newApp = {
        scholarshipName: 'Test Scholarship',
        organization: 'Test Org',
        amount: 5000,
        deadline: '2024-12-31',
      };

      const createdApp = { ...mockApplications.inProgress, ...newApp };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdApp,
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await createApplication(1, newApp);

      expect(result).toEqual(createdApp);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('updateApplication', () => {
    it('should update an existing application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateApplication } = await import('./applications.service.js');

      const updates = { status: 'Submitted' };
      const updatedApp = { ...mockApplications.inProgress, status: 'Submitted' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedApp,
              error: null,
            }),
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateApplication(1, 1, updates);

      expect(result).toEqual(updatedApp);
    });
  });

  describe('deleteApplication', () => {
    it('should delete an application', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { deleteApplication } = await import('./applications.service.js');

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

      await deleteApplication(1, 1);

      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
