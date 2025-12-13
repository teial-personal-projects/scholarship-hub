/**
 * Tests for users service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, generateMockUser } from '../test/helpers/supabase-mock';
import { mockUsers } from '../test/fixtures/users.fixture';

// Mock the supabase client
vi.mock('../config/supabase.js', () => ({
  supabase: createMockSupabaseClient(),
}));

// Mock the utils
vi.mock('../utils/supabase.js', () => ({
  getUserProfileById: vi.fn(),
}));

describe('users.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile with search preferences', async () => {
      const { getUserProfileById } = await import('../utils/supabase.js');
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfile } = await import('./users.service.js');

      // Mock getUserProfileById
      vi.mocked(getUserProfileById).mockResolvedValue(mockUsers.withSearchPreferences);

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

      const result = await getUserProfile(3);

      expect(getUserProfileById).toHaveBeenCalledWith(3);
      expect(result).toHaveProperty('searchPreferences');
      expect(result.searchPreferences).toEqual(mockUsers.withSearchPreferences.search_preferences);
    });

    it('should handle user without search preferences', async () => {
      const { getUserProfileById } = await import('../utils/supabase.js');
      const { supabase } = await import('../config/supabase.js');
      const { getUserProfile } = await import('./users.service.js');

      vi.mocked(getUserProfileById).mockResolvedValue(mockUsers.student1);

      // Mock search preferences query returning null (not found)
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // No rows found
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserProfile(1);

      expect(result.searchPreferences).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile with provided fields', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateUserProfile } = await import('./users.service.js');

      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+12025551234',
      };

      const updatedUser = {
        ...mockUsers.student1,
        first_name: 'Updated',
        last_name: 'Name',
        phone_number: '+12025551234',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedUser,
              error: null,
            }),
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await updateUserProfile(1, updates);

      expect(mockUpdate).toHaveBeenCalledWith({
        first_name: 'Updated',
        last_name: 'Name',
        phone_number: '+12025551234',
      });
      expect(result).toEqual(updatedUser);
    });

    it('should only update provided fields', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { updateUserProfile } = await import('./users.service.js');

      const updates = { firstName: 'John' };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUsers.student1,
              error: null,
            }),
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      await updateUserProfile(1, updates);

      expect(mockUpdate).toHaveBeenCalledWith({
        first_name: 'John',
      });
    });
  });

  describe('getUserRoles', () => {
    it('should return array of user roles', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserRoles } = await import('./users.service.js');

      const mockRoles = [
        { role: 'student' },
        { role: 'collaborator' },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockRoles,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserRoles(1);

      expect(result).toEqual(['student', 'collaborator']);
    });

    it('should return empty array when user has no roles', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserRoles } = await import('./users.service.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserRoles(1);

      expect(result).toEqual([]);
    });
  });

  describe('getUserSearchPreferences', () => {
    it('should return search preferences when they exist', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserSearchPreferences } = await import('./users.service.js');

      const mockPrefs = mockUsers.withSearchPreferences.search_preferences;

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPrefs,
              error: null,
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserSearchPreferences(3);

      expect(result).toEqual(mockPrefs);
    });

    it('should return null when search preferences do not exist', async () => {
      const { supabase } = await import('../config/supabase.js');
      const { getUserSearchPreferences } = await import('./users.service.js');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }, // No rows found
            }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const result = await getUserSearchPreferences(1);

      expect(result).toBeNull();
    });
  });
});
