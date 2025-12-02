/**
 * Collaborations Service
 * Business logic for collaboration management
 */

import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/error-handler.js';
import {
  DB_ERROR_CODES,
  isDbErrorCode,
} from '../constants/db-errors.js';

/**
 * Verify that a collaborator belongs to the user
 */
const verifyCollaboratorOwnership = async (collaboratorId: number, userId: number) => {
  const { data, error } = await supabase
    .from('collaborators')
    .select('id')
    .eq('id', collaboratorId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new AppError('Collaborator not found', 404);
  }
};

/**
 * Verify that an application belongs to the user
 */
const verifyApplicationOwnership = async (applicationId: number, userId: number) => {
  const { data, error } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new AppError('Application not found', 404);
  }
};

/**
 * Verify that an essay belongs to the user
 */
const verifyEssayOwnership = async (essayId: number, userId: number) => {
  const { data, error } = await supabase
    .from('essays')
    .select('id, application_id, applications!inner(user_id)')
    .eq('id', essayId)
    .eq('applications.user_id', userId)
    .single();

  if (error || !data) {
    throw new AppError('Essay not found', 404);
  }

  return data;
};

/**
 * Get all collaborations for a specific application
 */
export const getCollaborationsByApplicationId = async (
  applicationId: number,
  userId: number
) => {
  // Verify application ownership
  await verifyApplicationOwnership(applicationId, userId);

  const { data, error } = await supabase
    .from('collaborations')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Get all collaborations for a specific essay
 */
export const getCollaborationsByEssayId = async (
  essayId: number,
  userId: number
) => {
  // Verify essay ownership
  await verifyEssayOwnership(essayId, userId);

  // Get essay review collaborations for this essay
  const { data: essayReviewCollabs, error: reviewError } = await supabase
    .from('essay_review_collaborations')
    .select('collaboration_id')
    .eq('essay_id', essayId);

  if (reviewError) throw reviewError;

  if (!essayReviewCollabs || essayReviewCollabs.length === 0) {
    return [];
  }

  // Get full collaboration details for these essay reviews
  const collaborationIds = essayReviewCollabs.map((erc) => erc.collaboration_id);

  const { data, error } = await supabase
    .from('collaborations')
    .select('*')
    .in('id', collaborationIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Get a single collaboration by ID (with ownership verification)
 */
export const getCollaborationById = async (collaborationId: number, userId: number) => {
  const { data, error } = await supabase
    .from('collaborations')
    .select(`
      *,
      collaborators!inner(user_id)
    `)
    .eq('id', collaborationId)
    .eq('collaborators.user_id', userId)
    .single();

  if (error) {
    if (isDbErrorCode(error, DB_ERROR_CODES.NO_ROWS_FOUND)) {
      throw new AppError('Collaboration not found', 404);
    }
    throw error;
  }

  // Remove the nested collaborators object
  const { collaborators, ...collaboration } = data as any;

  // Fetch type-specific data based on collaboration_type
  const typeSpecificData = await getTypeSpecificData(
    collaboration.id,
    collaboration.collaboration_type
  );

  return {
    ...collaboration,
    ...typeSpecificData,
  };
};

/**
 * Get type-specific data for a collaboration
 */
const getTypeSpecificData = async (collaborationId: number, collaborationType: string) => {
  switch (collaborationType) {
    case 'essayReview': {
      const { data } = await supabase
        .from('essay_review_collaborations')
        .select('*')
        .eq('collaboration_id', collaborationId);
      return { essayReviews: data || [] };
    }
    case 'recommendation': {
      const { data } = await supabase
        .from('recommendation_collaborations')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .single();
      return data || {};
    }
    case 'guidance': {
      const { data } = await supabase
        .from('guidance_collaborations')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .single();
      return data || {};
    }
    default:
      return {};
  }
};

/**
 * Create a new collaboration
 */
export const createCollaboration = async (
  userId: number,
  collaborationData: {
    collaboratorId: number;
    applicationId: number;
    collaborationType: 'recommendation' | 'essayReview' | 'guidance';
    status?: string;
    awaitingActionFrom?: string;
    awaitingActionType?: string;
    nextActionDescription?: string;
    nextActionDueDate?: string;
    notes?: string;
    // Type-specific fields
    essayId?: number; // For essayReview
    portalUrl?: string; // For recommendation
    portalDeadline?: string; // For recommendation
    sessionType?: string; // For guidance
    meetingUrl?: string; // For guidance
    scheduledFor?: string; // For guidance
  }
) => {
  // Verify ownership
  await verifyCollaboratorOwnership(collaborationData.collaboratorId, userId);
  await verifyApplicationOwnership(collaborationData.applicationId, userId);

  // Convert camelCase to snake_case for base collaboration
  const dbData: Record<string, unknown> = {
    collaborator_id: collaborationData.collaboratorId,
    application_id: collaborationData.applicationId,
    collaboration_type: collaborationData.collaborationType,
  };

  if (collaborationData.status !== undefined) dbData.status = collaborationData.status;
  if (collaborationData.awaitingActionFrom !== undefined)
    dbData.awaiting_action_from = collaborationData.awaitingActionFrom;
  if (collaborationData.awaitingActionType !== undefined)
    dbData.awaiting_action_type = collaborationData.awaitingActionType;
  if (collaborationData.nextActionDescription !== undefined)
    dbData.next_action_description = collaborationData.nextActionDescription;
  if (collaborationData.nextActionDueDate !== undefined)
    dbData.next_action_due_date = collaborationData.nextActionDueDate;
  if (collaborationData.notes !== undefined) dbData.notes = collaborationData.notes;

  // Create base collaboration
  const { data: collaboration, error } = await supabase
    .from('collaborations')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  // Create type-specific data
  if (collaborationData.collaborationType === 'essayReview' && collaborationData.essayId) {
    await supabase.from('essay_review_collaborations').insert({
      collaboration_id: collaboration.id,
      essay_id: collaborationData.essayId,
    });
  } else if (collaborationData.collaborationType === 'recommendation') {
    const recData: Record<string, unknown> = {
      collaboration_id: collaboration.id,
    };
    if (collaborationData.portalUrl !== undefined) recData.portal_url = collaborationData.portalUrl;
    if (collaborationData.portalDeadline !== undefined)
      recData.portal_deadline = collaborationData.portalDeadline;
    await supabase.from('recommendation_collaborations').insert(recData);
  } else if (collaborationData.collaborationType === 'guidance') {
    const guidanceData: Record<string, unknown> = {
      collaboration_id: collaboration.id,
    };
    if (collaborationData.sessionType !== undefined)
      guidanceData.session_type = collaborationData.sessionType;
    if (collaborationData.meetingUrl !== undefined) guidanceData.meeting_url = collaborationData.meetingUrl;
    if (collaborationData.scheduledFor !== undefined)
      guidanceData.scheduled_for = collaborationData.scheduledFor;
    await supabase.from('guidance_collaborations').insert(guidanceData);
  }

  // Fetch full collaboration with type-specific data
  return getCollaborationById(collaboration.id, userId);
};

/**
 * Update a collaboration
 */
export const updateCollaboration = async (
  collaborationId: number,
  userId: number,
  updates: {
    status?: string;
    awaitingActionFrom?: string;
    awaitingActionType?: string;
    nextActionDescription?: string;
    nextActionDueDate?: string;
    notes?: string;
    // Type-specific fields
    portalUrl?: string; // For recommendation
    portalDeadline?: string; // For recommendation
    questionnaireCompleted?: boolean; // For recommendation
    sessionType?: string; // For guidance
    meetingUrl?: string; // For guidance
    scheduledFor?: string; // For guidance
  }
) => {
  // First verify ownership
  const existing = await getCollaborationById(collaborationId, userId);

  // Convert camelCase to snake_case for base collaboration
  const dbUpdates: Record<string, unknown> = {};

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.awaitingActionFrom !== undefined)
    dbUpdates.awaiting_action_from = updates.awaitingActionFrom;
  if (updates.awaitingActionType !== undefined)
    dbUpdates.awaiting_action_type = updates.awaitingActionType;
  if (updates.nextActionDescription !== undefined)
    dbUpdates.next_action_description = updates.nextActionDescription;
  if (updates.nextActionDueDate !== undefined)
    dbUpdates.next_action_due_date = updates.nextActionDueDate;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  // Update base collaboration
  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase
      .from('collaborations')
      .update(dbUpdates)
      .eq('id', collaborationId);

    if (error) throw error;
  }

  // Update type-specific data
  if (existing.collaboration_type === 'recommendation') {
    const recUpdates: Record<string, unknown> = {};
    if (updates.portalUrl !== undefined) recUpdates.portal_url = updates.portalUrl;
    if (updates.portalDeadline !== undefined) recUpdates.portal_deadline = updates.portalDeadline;
    if (updates.questionnaireCompleted !== undefined)
      recUpdates.questionnaire_completed = updates.questionnaireCompleted;

    if (Object.keys(recUpdates).length > 0) {
      const { error } = await supabase
        .from('recommendation_collaborations')
        .update(recUpdates)
        .eq('collaboration_id', collaborationId);

      if (error) throw error;
    }
  } else if (existing.collaboration_type === 'guidance') {
    const guidanceUpdates: Record<string, unknown> = {};
    if (updates.sessionType !== undefined) guidanceUpdates.session_type = updates.sessionType;
    if (updates.meetingUrl !== undefined) guidanceUpdates.meeting_url = updates.meetingUrl;
    if (updates.scheduledFor !== undefined) guidanceUpdates.scheduled_for = updates.scheduledFor;

    if (Object.keys(guidanceUpdates).length > 0) {
      const { error } = await supabase
        .from('guidance_collaborations')
        .update(guidanceUpdates)
        .eq('collaboration_id', collaborationId);

      if (error) throw error;
    }
  }

  // Return updated collaboration
  return getCollaborationById(collaborationId, userId);
};

/**
 * Delete a collaboration
 */
export const deleteCollaboration = async (collaborationId: number, userId: number) => {
  // First verify ownership
  await getCollaborationById(collaborationId, userId);

  // Delete will cascade to type-specific tables
  const { error } = await supabase.from('collaborations').delete().eq('id', collaborationId);

  if (error) throw error;
};

/**
 * Add history entry to a collaboration
 */
export const addCollaborationHistory = async (
  collaborationId: number,
  userId: number,
  historyData: {
    action: string;
    details?: string;
  }
) => {
  // Verify ownership
  await getCollaborationById(collaborationId, userId);

  const { data, error } = await supabase
    .from('collaboration_history')
    .insert({
      collaboration_id: collaborationId,
      action: historyData.action,
      details: historyData.details,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Get collaboration history
 */
export const getCollaborationHistory = async (collaborationId: number, userId: number) => {
  // Verify ownership
  await getCollaborationById(collaborationId, userId);

  const { data, error } = await supabase
    .from('collaboration_history')
    .select('*')
    .eq('collaboration_id', collaborationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

