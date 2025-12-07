import { supabase } from '../config/supabase.js';
import { getUserProfileById } from '../utils/supabase.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';
import type { DashboardReminders } from '@scholarship-hub/shared';

/**
 * Get user profile by user ID
 */
export const getUserProfile = async (userId: number) => {
  const profile = await getUserProfileById(userId);

  // Also fetch search preferences
  const { data: searchPrefs, error: searchError } = await supabase
    .from('user_search_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (searchError && !isDbErrorCode(searchError, DB_ERROR_CODES.NO_ROWS_FOUND)) {
    // If error is not "not found", throw it
    throw searchError;
  }

  return {
    ...profile,
    searchPreferences: searchPrefs || null,
  };
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: number,
  updates: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }
) => {
  // Convert camelCase to snake_case for database
  const dbUpdates: Record<string, unknown> = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;

  const { data, error } = await supabase
    .from('user_profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Get user roles
 */
export const getUserRoles = async (userId: number) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) throw error;

  return data.map((row) => row.role);
};

/**
 * Get user search preferences
 */
export const getUserSearchPreferences = async (userId: number) => {
  const { data, error } = await supabase
    .from('user_search_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && !isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
    throw error;
  }

  return data || null;
};

/**
 * Update user search preferences
 */
export const updateUserSearchPreferences = async (
  userId: number,
  preferences: {
    targetType?: string;
    subjectAreas?: string[];
    gender?: string;
    ethnicity?: string;
    minAward?: number;
    geographicRestrictions?: string;
    essayRequired?: boolean;
    recommendationRequired?: boolean;
    academicLevel?: string;
  }
) => {
  // Convert camelCase to snake_case (don't include user_id in update data)
  const dbPrefs: Record<string, unknown> = {};
  if (preferences.targetType !== undefined) dbPrefs.target_type = preferences.targetType;
  if (preferences.subjectAreas !== undefined) dbPrefs.subject_areas = preferences.subjectAreas;
  if (preferences.gender !== undefined) dbPrefs.gender = preferences.gender;
  if (preferences.ethnicity !== undefined) dbPrefs.ethnicity = preferences.ethnicity;
  if (preferences.minAward !== undefined) dbPrefs.min_award = preferences.minAward;
  if (preferences.geographicRestrictions !== undefined) dbPrefs.geographic_restrictions = preferences.geographicRestrictions;
  if (preferences.essayRequired !== undefined) dbPrefs.essay_required = preferences.essayRequired;
  if (preferences.recommendationRequired !== undefined) dbPrefs.recommendation_required = preferences.recommendationRequired;
  if (preferences.academicLevel !== undefined) dbPrefs.academic_level = preferences.academicLevel;

  // Check if preferences already exist
  const { data: existing, error: checkError } = await supabase
    .from('user_search_preferences')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError && !isDbErrorCode(checkError, DB_ERROR_CODES.NO_ROWS_FOUND)) {
    throw checkError;
  }

  let data;
  let error;

  if (existing) {
    // Update existing record (don't include user_id in update)
    const result = await supabase
      .from('user_search_preferences')
      .update(dbPrefs)
      .eq('user_id', userId)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Insert new record (include user_id for insert)
    const insertData = { ...dbPrefs, user_id: userId };
    const result = await supabase
      .from('user_search_preferences')
      .insert(insertData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    // Log error with context for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Failed to save user search preferences:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        dbPrefs,
        existing: !!existing,
      });
    } else {
      console.error('❌ Failed to save user search preferences:', {
        error: error.message,
        code: error.code,
        userId,
      });
    }
    throw error;
  }

  return data;
};

/**
 * Get dashboard reminders for a user
 * Returns upcoming and overdue applications and collaborations
 */
export const getUserReminders = async (userId: number): Promise<DashboardReminders> => {
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Query applications due soon (within 7 days)
  const { data: dueSoonApps, error: dueSoonError } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', now.toISOString().split('T')[0])
    .lte('due_date', sevenDaysFromNow.toISOString().split('T')[0])
    .neq('status', 'Submitted')
    .neq('status', 'Awarded')
    .neq('status', 'Not Awarded')
    .order('due_date', { ascending: true });

  if (dueSoonError) throw dueSoonError;

  // Query overdue applications (past due date and not submitted)
  const { data: overdueApps, error: overdueError } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .lt('due_date', now.toISOString().split('T')[0])
    .neq('status', 'Submitted')
    .neq('status', 'Awarded')
    .neq('status', 'Not Awarded')
    .order('due_date', { ascending: true });

  if (overdueError) throw overdueError;

  // Query collaborations due soon (within 7 days)
  const { data: dueSoonCollabs, error: dueSoonCollabsError } = await supabase
    .from('collaborations')
    .select('*')
    .eq('user_id', userId)
    .not('next_action_due_date', 'is', null)
    .gte('next_action_due_date', now.toISOString().split('T')[0])
    .lte('next_action_due_date', sevenDaysFromNow.toISOString().split('T')[0])
    .neq('status', 'completed')
    .neq('status', 'declined')
    .order('next_action_due_date', { ascending: true });

  if (dueSoonCollabsError) throw dueSoonCollabsError;

  // Query overdue collaborations
  const { data: overdueCollabs, error: overdueCollabsError } = await supabase
    .from('collaborations')
    .select('*')
    .eq('user_id', userId)
    .not('next_action_due_date', 'is', null)
    .lt('next_action_due_date', now.toISOString().split('T')[0])
    .neq('status', 'completed')
    .neq('status', 'declined')
    .order('next_action_due_date', { ascending: true });

  if (overdueCollabsError) throw overdueCollabsError;

  // Query pending collaborations (invited but not accepted)
  const { data: pendingCollabs, error: pendingCollabsError } = await supabase
    .from('collaborations')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'invited'])
    .order('created_at', { ascending: false });

  if (pendingCollabsError) throw pendingCollabsError;

  return {
    applications: {
      dueSoon: dueSoonApps || [],
      overdue: overdueApps || [],
    },
    collaborations: {
      pendingResponse: pendingCollabs || [],
      dueSoon: dueSoonCollabs || [],
      overdue: overdueCollabs || [],
    },
    stats: {
      totalUpcoming: (dueSoonApps?.length || 0) + (dueSoonCollabs?.length || 0),
      totalOverdue: (overdueApps?.length || 0) + (overdueCollabs?.length || 0),
    },
  };
};
