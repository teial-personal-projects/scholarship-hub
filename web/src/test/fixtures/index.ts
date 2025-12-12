/**
 * Frontend Test Fixtures
 * Sample data for testing components
 */

import type {
  UserProfile,
  ApplicationResponse,
  EssayResponse,
  CollaboratorResponse,
  CollaborationResponse
} from '@scholarship-hub/shared';

/**
 * Mock Users
 */
export const mockUsers: Record<string, UserProfile> = {
  student1: {
    id: 1,
    authUserId: 'auth-user-1',
    emailAddress: 'student1@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    applicationRemindersEnabled: true,
    collaborationRemindersEnabled: true,
    reminderIntervals: { application: [7, 3, 1], collaboration: [7, 3, 1] },
    searchPreferences: null,
  },
  withPreferences: {
    id: 2,
    authUserId: 'auth-user-2',
    emailAddress: 'student2@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: null,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    applicationRemindersEnabled: true,
    collaborationRemindersEnabled: true,
    reminderIntervals: { application: [7, 3, 1], collaboration: [7, 3, 1] },
    searchPreferences: {
      targetType: 'Merit',
      subjectAreas: ['Computer Science'],
      gender: 'Female',
      ethnicity: 'Asian/Pacific Islander',
      minAward: 1000,
      geographicRestrictions: null,
      essayRequired: false,
      recommendationRequired: true,
      academicLevel: 'Undergraduate',
    },
  },
};

/**
 * Mock Applications
 */
export const mockApplications: Record<string, ApplicationResponse> = {
  inProgress: {
    id: 1,
    userId: 1,
    scholarshipName: 'Merit Scholarship',
    organization: 'State University',
    amount: 5000,
    deadline: '2024-12-31',
    status: 'In Progress',
    url: 'https://example.com/scholarship1',
    description: 'A merit-based scholarship',
    requirements: 'GPA 3.5+, Essay, Two recommendation letters',
    notes: 'Important scholarship',
    appliedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  submitted: {
    id: 2,
    userId: 1,
    scholarshipName: 'Community Service Award',
    organization: 'Local Foundation',
    amount: 2500,
    deadline: '2024-11-30',
    status: 'Submitted',
    url: 'https://example.com/scholarship2',
    description: 'For students with outstanding community service',
    requirements: 'Community service hours, Essay',
    notes: 'Submitted on Nov 15',
    appliedAt: '2024-11-15T00:00:00Z',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
  },
};

/**
 * Mock Essays
 */
export const mockEssays: Record<string, EssayResponse> = {
  personalStatement: {
    id: 1,
    applicationId: 1,
    userId: 1,
    title: 'Personal Statement',
    prompt: 'Describe your educational goals',
    content: 'My educational journey...',
    wordCount: 500,
    essayLink: 'https://docs.google.com/document/d/abc123',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  draft: {
    id: 2,
    applicationId: 1,
    userId: 1,
    title: 'Draft Essay',
    prompt: 'Why this university?',
    content: 'Work in progress...',
    wordCount: 150,
    essayLink: null,
    createdAt: '2024-01-09T00:00:00Z',
    updatedAt: '2024-01-09T00:00:00Z',
  },
};

/**
 * Mock Collaborators
 */
export const mockCollaborators: Record<string, CollaboratorResponse> = {
  teacher: {
    id: 1,
    userId: 1,
    name: 'Dr. Sarah Johnson',
    emailAddress: 'teacher@school.edu',
    relationship: 'Teacher',
    phoneNumber: '+1234567891',
    notes: 'English teacher',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  counselor: {
    id: 2,
    userId: 1,
    name: 'Mr. Michael Brown',
    emailAddress: 'counselor@school.edu',
    relationship: 'Counselor',
    phoneNumber: '+1234567892',
    notes: 'School counselor',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
};

/**
 * Mock Collaborations
 */
export const mockCollaborations: Record<string, CollaborationResponse> = {
  recommendationPending: {
    id: 1,
    collaboratorId: 1,
    applicationId: 1,
    collaborationType: 'recommendation',
    status: 'pending',
    awaitingActionFrom: 'student',
    awaitingActionType: 'send_invite',
    nextActionDescription: 'Send invitation to collaborator',
    nextActionDueDate: '2024-12-15',
    notes: 'Need letter for Merit Scholarship',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  essayReviewInProgress: {
    id: 2,
    collaboratorId: 2,
    applicationId: 1,
    collaborationType: 'essayReview',
    status: 'in_progress',
    awaitingActionFrom: 'collaborator',
    awaitingActionType: 'provide_feedback',
    nextActionDescription: 'Provide feedback on essay',
    nextActionDueDate: '2024-12-18',
    notes: 'Personal statement review',
    createdAt: '2024-01-14T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
};

/**
 * Helper to create mock user
 */
export function createMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return { ...mockUsers.student1, ...overrides };
}

/**
 * Helper to create mock application
 */
export function createMockApplication(overrides: Partial<ApplicationResponse> = {}): ApplicationResponse {
  return { ...mockApplications.inProgress, ...overrides };
}

/**
 * Helper to create mock essay
 */
export function createMockEssay(overrides: Partial<EssayResponse> = {}): EssayResponse {
  return { ...mockEssays.personalStatement, ...overrides };
}

/**
 * Helper to create mock collaborator
 */
export function createMockCollaborator(overrides: Partial<CollaboratorResponse> = {}): CollaboratorResponse {
  return { ...mockCollaborators.teacher, ...overrides };
}

/**
 * Helper to create mock collaboration
 */
export function createMockCollaboration(overrides: Partial<CollaborationResponse> = {}): CollaborationResponse {
  return { ...mockCollaborations.recommendationPending, ...overrides };
}
