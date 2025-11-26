export interface SearchCriteria {
  subjectAreas: string[];
  keywords: string;
  academicLevel: string | null;
  targetType: string | null;
  gender: string | null;
  ethnicity: string | null;
  geographicRestrictions?: string[] | null;
  essayRequired: boolean | null;
  recommendationRequired: boolean | null;
  academicGpa?: number;
  minAward?: number | null;
  deadlineRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface SearchOptions {
  maxResults?: number;
  sortBy?: 'relevance' | 'deadline' | 'amount' | 'title';
  sortOrder?: 'asc' | 'desc';
  includeExpired?: boolean;
}