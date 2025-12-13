/**
 * Scholarship Service
 * Handles scholarship search, recommendations, and user interactions
 */
import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import { DB_ERROR_CODES, isDbErrorCode } from '../constants/db-errors.js';
import { calculateMatchScore } from './scholarship-matching.service.js';

export interface ScholarshipSearchParams {
  query?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  deadlineBefore?: string;
  educationLevel?: string;
  fieldOfStudy?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

export interface ScholarshipResponse {
  id: number;
  name: string;
  organization?: string;
  amount?: number;
  description?: string;
  eligibility?: string;
  requirements?: string;
  url: string;
  application_url?: string;
  source_url?: string;
  deadline?: string;
  deadline_type?: 'fixed' | 'rolling' | 'varies';
  recurring?: boolean;
  category?: string;
  target_type?: string;
  education_level?: string;
  field_of_study?: string;
  status: 'active' | 'expired' | 'invalid' | 'archived';
  verified: boolean;
  source_type: 'scraper' | 'ai_discovery' | 'manual';
  source_name?: string;
  discovered_at: string;
  last_verified_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserScholarshipPreferences {
  category?: string;
  targetType?: string;
  minAmount?: number;
  maxAmount?: number;
  educationLevel?: string;
  fieldOfStudy?: string;
  keywords?: string[];
}

/**
 * Search scholarships with filters
 */
export async function searchScholarships(
  params: ScholarshipSearchParams,
  userId?: number
): Promise<ScholarshipResponse[]> {
  let query = supabase
    .from('scholarships')
    .select('*')
    .eq('status', 'active')
    .gte('deadline', new Date().toISOString());

  // Keyword search (full-text search on name, description, organization)
  if (params.query) {
    query = query.or(
      `name.ilike.%${params.query}%,` +
      `description.ilike.%${params.query}%,` +
      `organization.ilike.%${params.query}%`
    );
  }

  // Category filter
  if (params.category) {
    query = query.eq('category', params.category);
  }

  // Amount range
  if (params.minAmount !== undefined) {
    query = query.gte('amount', params.minAmount);
  }
  if (params.maxAmount !== undefined) {
    query = query.lte('amount', params.maxAmount);
  }

  // Deadline filter
  if (params.deadlineBefore) {
    query = query.lte('deadline', params.deadlineBefore);
  }

  // Education level
  if (params.educationLevel) {
    query = query.eq('education_level', params.educationLevel);
  }

  // Field of study
  if (params.fieldOfStudy) {
    query = query.ilike('field_of_study', `%${params.fieldOfStudy}%`);
  }

  // Target type
  if (params.targetType) {
    query = query.eq('target_type', params.targetType);
  }

  // Exclude scholarships user has already viewed/dismissed
  if (userId) {
    const { data: viewedIds } = await supabase
      .from('user_scholarships')
      .select('scholarship_id')
      .eq('user_id', userId)
      .in('status', ['viewed', 'dismissed']);

    if (viewedIds && viewedIds.length > 0) {
      const ids = viewedIds.map(v => v.scholarship_id);
      query = query.not('id', 'in', `(${ids.join(',')})`);
    }
  }

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  query = query
    .order('deadline', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Failed to search scholarships: ${error.message}`, 500);
  }

  return data as ScholarshipResponse[];
}

/**
 * Get scholarship by ID
 */
export async function getScholarshipById(id: number): Promise<ScholarshipResponse> {
  const { data, error } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Scholarship not found', 404);
    }
    throw error;
  }

  return data as ScholarshipResponse;
}

/**
 * Get recommended scholarships for a user
 */
export async function getRecommendedScholarships(
  userId: number,
  limit: number = 10
): Promise<ScholarshipResponse[]> {
  // Verify the user exists (auth middleware should ensure this, but keep it defensive)
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw new AppError(`Failed to load user profile: ${userError.message}`, 500);
  }
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Load normalized search preferences (this repo uses `user_search_preferences`, not a JSON column)
  const { data: prefsRow, error: prefsError } = await supabase
    .from('user_search_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (prefsError && !isDbErrorCode(prefsError, DB_ERROR_CODES.NO_ROWS_FOUND)) {
    const msg =
      (prefsError as unknown as { message?: string } | null)?.message ??
      String(prefsError);
    throw new AppError(`Failed to load user search preferences: ${msg}`, 500);
  }

  // Build query based on preferences
  let query = supabase
    .from('scholarships')
    .select('*')
    .eq('status', 'active')
    .gte('deadline', new Date().toISOString());

  const prefs: UserScholarshipPreferences | null = prefsRow
    ? {
        targetType: prefsRow.target_type ?? undefined,
        // Schema stores min_award in preferences; treat it as minAmount for filtering/scoring.
        minAmount:
          prefsRow.min_award === null || prefsRow.min_award === undefined
            ? undefined
            : Number(prefsRow.min_award),
        educationLevel: prefsRow.academic_level ?? undefined,
        // Map subject_areas to keywords so scoring logic can use them.
        keywords:
          Array.isArray(prefsRow.subject_areas) && prefsRow.subject_areas.length > 0
            ? prefsRow.subject_areas
            : undefined,
      }
    : null;

  if (prefs) {
    if (prefs.targetType) {
      query = query.eq('target_type', prefs.targetType);
    }
    if (prefs.minAmount !== undefined) {
      query = query.gte('amount', prefs.minAmount);
    }
    if (prefs.educationLevel) {
      query = query.eq('education_level', prefs.educationLevel);
    }
    // If we have subject-area keywords, filter scholarships that mention any of them.
    if (prefs.keywords && prefs.keywords.length > 0) {
      const orQuery = prefs.keywords
        .filter((k) => typeof k === 'string' && k.trim().length > 0)
        .map((k) => `field_of_study.ilike.%${k.trim()}%`)
        .join(',');
      if (orQuery) query = query.or(orQuery);
    } else if (prefs.fieldOfStudy) {
      query = query.ilike('field_of_study', `%${prefs.fieldOfStudy}%`);
    }
  }

  // Exclude already viewed/saved/dismissed scholarships
  const { data: interactedIds } = await supabase
    .from('user_scholarships')
    .select('scholarship_id')
    .eq('user_id', userId);

  if (interactedIds && interactedIds.length > 0) {
    const ids = interactedIds.map(v => v.scholarship_id);
    query = query.not('id', 'in', `(${ids.join(',')})`);
  }

  query = query
    .order('amount', { ascending: false })
    .limit(limit * 2); // Fetch more to score and sort

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Failed to get recommendations: ${error.message}`, 500);
  }

  // Calculate match scores for all scholarships
  const scholarshipsWithScores = (data as ScholarshipResponse[]).map(scholarship => {
    const matchResult = calculateMatchScore(scholarship, prefs || undefined);
    return {
      ...scholarship,
      matchScore: matchResult.score,
      matchReasons: matchResult.reasons
    };
  });

  // Sort by match score and return top results
  return scholarshipsWithScores
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, limit) as ScholarshipResponse[];
}

/**
 * Save scholarship to user's list
 */
export async function saveScholarship(
  userId: number,
  scholarshipId: number,
  matchScore?: number
): Promise<void> {
  const { error } = await supabase
    .from('user_scholarships')
    .upsert({
      user_id: userId,
      scholarship_id: scholarshipId,
      status: 'saved',
      saved_at: new Date().toISOString(),
      match_score: matchScore
    }, {
      onConflict: 'user_id,scholarship_id'
    });

  if (error) {
    throw new AppError(`Failed to save scholarship: ${error.message}`, 500);
  }
}

/**
 * Dismiss scholarship (hide from recommendations)
 */
export async function dismissScholarship(
  userId: number,
  scholarshipId: number
): Promise<void> {
  const { error } = await supabase
    .from('user_scholarships')
    .upsert({
      user_id: userId,
      scholarship_id: scholarshipId,
      status: 'dismissed',
      dismissed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,scholarship_id'
    });

  if (error) {
    throw new AppError(`Failed to dismiss scholarship: ${error.message}`, 500);
  }
}

/**
 * Mark scholarship as viewed
 */
export async function markScholarshipViewed(
  userId: number,
  scholarshipId: number
): Promise<void> {
  // Check if scholarship interaction already exists
  const { data: existing } = await supabase
    .from('user_scholarships')
    .select('status')
    .eq('user_id', userId)
    .eq('scholarship_id', scholarshipId)
    .single();

  // Only mark as viewed if it hasn't been saved or dismissed
  if (!existing || existing.status === 'suggested') {
    const { error } = await supabase
      .from('user_scholarships')
      .upsert({
        user_id: userId,
        scholarship_id: scholarshipId,
        status: 'viewed',
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,scholarship_id'
      });

    if (error) {
      throw new AppError(`Failed to mark scholarship as viewed: ${error.message}`, 500);
    }
  }
}

/**
 * Get user's saved scholarships
 */
export async function getSavedScholarships(userId: number): Promise<ScholarshipResponse[]> {
  const { data, error } = await supabase
    .from('user_scholarships')
    .select('scholarships(*)')
    .eq('user_id', userId)
    .eq('status', 'saved')
    .order('saved_at', { ascending: false });

  if (error) {
    throw new AppError(`Failed to get saved scholarships: ${error.message}`, 500);
  }

  // Extract scholarship data from the join
  return data.map((item: any) => item.scholarships) as ScholarshipResponse[];
}
