/**
 * Scholarship Finder Types
 * Types for the automated scholarship discovery and search system
 */

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

export interface UserScholarshipPreferences {
  category?: string;
  targetType?: string;
  minAmount?: number;
  maxAmount?: number;
  educationLevel?: string;
  fieldOfStudy?: string;
  keywords?: string[];
}

export interface UserScholarshipInteraction {
  id: number;
  user_id: number;
  scholarship_id: number;
  status: 'suggested' | 'viewed' | 'saved' | 'applied' | 'dismissed';
  viewed_at?: string;
  saved_at?: string;
  dismissed_at?: string;
  notes?: string;
  match_score?: number;
  match_reasons?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  score: number; // 0-100
  reasons: string[];
}
