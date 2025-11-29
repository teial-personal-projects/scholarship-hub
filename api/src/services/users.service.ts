import { supabase } from '../config/supabase.js';
import { getUserProfileById } from '../utils/supabase.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';

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
  // Convert camelCase to snake_case
  const dbPrefs: Record<string, unknown> = { user_id: userId };
  if (preferences.targetType !== undefined) dbPrefs.target_type = preferences.targetType;
  if (preferences.subjectAreas !== undefined) dbPrefs.subject_areas = preferences.subjectAreas;
  if (preferences.gender !== undefined) dbPrefs.gender = preferences.gender;
  if (preferences.ethnicity !== undefined) dbPrefs.ethnicity = preferences.ethnicity;
  if (preferences.minAward !== undefined) dbPrefs.min_award = preferences.minAward;
  if (preferences.geographicRestrictions !== undefined) dbPrefs.geographic_restrictions = preferences.geographicRestrictions;
  if (preferences.essayRequired !== undefined) dbPrefs.essay_required = preferences.essayRequired;
  if (preferences.recommendationRequired !== undefined) dbPrefs.recommendation_required = preferences.recommendationRequired;
  if (preferences.academicLevel !== undefined) dbPrefs.academic_level = preferences.academicLevel;

  // Try to update first
  const { data: existing } = await supabase
    .from('user_search_preferences')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('user_search_preferences')
      .update(dbPrefs)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('user_search_preferences')
      .insert(dbPrefs)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
