import type {
  EducationLevel,
  TargetType,
  SubjectArea,
  Gender,
  Ethnicity,
} from './application.constants.js';

export interface UserSearchPreferences {
  userId: number; // References user_profiles.user_id (BIGINT)
  targetType?: TargetType;
  subjectAreas?: SubjectArea[];
  gender?: Gender;
  ethnicity?: Ethnicity;
  minAward?: number | null;
  geographicRestrictions?: string | null;
  essayRequired?: boolean;
  recommendationRequired?: boolean;
  academicLevel?: EducationLevel;
  createdAt?: Date;
  updatedAt?: Date;
}