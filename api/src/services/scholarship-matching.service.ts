/**
 * Scholarship Matching Service
 * Calculates how well a scholarship matches a user's profile
 */
import type { ScholarshipResponse, UserScholarshipPreferences, MatchResult } from '@scholarship-hub/shared';

export function calculateMatchScore(
  scholarship: ScholarshipResponse,
  preferences?: UserScholarshipPreferences
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  const weights = {
    category: 25,
    educationLevel: 20,
    fieldOfStudy: 20,
    targetType: 15,
    amount: 10,
    deadline: 10
  };

  // Category match
  if (preferences?.category && scholarship.category === preferences.category) {
    score += weights.category;
    reasons.push(`Matches your ${scholarship.category} interest`);
  }

  // Education level match
  if (preferences?.educationLevel && scholarship.education_level === preferences.educationLevel) {
    score += weights.educationLevel;
    reasons.push(`Perfect for ${scholarship.education_level} students`);
  }

  // Field of study match
  if (preferences?.fieldOfStudy && scholarship.field_of_study) {
    const userField = preferences.fieldOfStudy.toLowerCase();
    const scholarshipField = scholarship.field_of_study.toLowerCase();

    if (scholarshipField.includes(userField) || userField.includes(scholarshipField)) {
      score += weights.fieldOfStudy;
      reasons.push(`Matches your ${preferences.fieldOfStudy} major`);
    }
  }

  // Target type match (Merit, Need-Based, etc.)
  if (preferences?.targetType && scholarship.target_type === preferences.targetType) {
    score += weights.targetType;
    reasons.push(`${scholarship.target_type} scholarship`);
  }

  // Amount preference
  const awardAmount =
    scholarship.max_award ??
    scholarship.min_award;

  if (preferences?.minAmount && awardAmount) {
    const awardValue = typeof awardAmount === 'string' ? Number(awardAmount) : awardAmount;
    if (Number.isFinite(awardValue) && awardValue >= preferences.minAmount) {
      score += weights.amount;
      reasons.push(`Award amount meets your minimum`);
    }
  }

  // Deadline (prefer scholarships with more time)
  if (scholarship.deadline) {
    const daysUntilDeadline = Math.floor(
      (new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline > 30) {
      score += weights.deadline;
      reasons.push(`Plenty of time to apply (${daysUntilDeadline} days)`);
    } else if (daysUntilDeadline > 14) {
      score += weights.deadline * 0.5;
      reasons.push(`Apply soon (${daysUntilDeadline} days left)`);
    }
  }

  return {
    score: Math.round(score),
    reasons
  };
}

/**
 * Get match score badge color based on score
 */
export function getMatchScoreBadgeColor(score: number): string {
  if (score >= 75) return 'green';
  if (score >= 50) return 'blue';
  if (score >= 25) return 'yellow';
  return 'gray';
}

/**
 * Get match score label based on score
 */
export function getMatchScoreLabel(score: number): string {
  if (score >= 75) return 'Excellent Match';
  if (score >= 50) return 'Good Match';
  if (score >= 25) return 'Fair Match';
  return 'Possible Match';
}
