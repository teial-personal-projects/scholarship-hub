/**
 * Collaborations Controller
 * HTTP handlers for collaboration endpoints
 */

import { Request, Response } from 'express';
import * as collaborationsService from '../services/collaborations.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared/utils/case-conversion';

/**
 * GET /api/applications/:applicationId/collaborations
 * Get all collaborations for an application
 */
export const getCollaborationsByApplication = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const applicationId = parseInt(req.params.applicationId || '', 10);

    if (isNaN(applicationId)) {
      res.status(400).json({ error: 'Invalid application ID' });
      return;
    }

    const collaborations = await collaborationsService.getCollaborationsByApplicationId(
      applicationId,
      req.user.userId
    );

    // Convert to camelCase
    const response = collaborations.map((collab) => toCamelCase(collab));

    res.json(response);
  }
);

/**
 * GET /api/essays/:essayId/collaborations
 * Get all collaborations for an essay
 */
export const getCollaborationsByEssay = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const essayId = parseInt(req.params.essayId || '', 10);

    if (isNaN(essayId)) {
      res.status(400).json({ error: 'Invalid essay ID' });
      return;
    }

    const collaborations = await collaborationsService.getCollaborationsByEssayId(
      essayId,
      req.user.userId
    );

    // Convert to camelCase
    const response = collaborations.map((collab) => toCamelCase(collab));

    res.json(response);
  }
);

/**
 * POST /api/collaborations
 * Create new collaboration
 */
export const createCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const {
    collaboratorId,
    applicationId,
    collaborationType,
    status,
    awaitingActionFrom,
    awaitingActionType,
    nextActionDescription,
    nextActionDueDate,
    notes,
    essayId,
    currentDraftVersion,
    feedbackRounds,
    lastFeedbackAt,
    portalUrl,
    sessionType,
    meetingUrl,
    scheduledFor,
  } = req.body;

  // Validate required fields
  if (!collaboratorId || !applicationId || !collaborationType) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'collaboratorId, applicationId, and collaborationType are required',
    });
    return;
  }

  // Validate collaboration type
  if (!['recommendation', 'essayReview', 'guidance'].includes(collaborationType)) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'collaborationType must be one of: recommendation, essayReview, guidance',
    });
    return;
  }

  // Validate essayReview requires essayId
  if (collaborationType === 'essayReview' && !essayId) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'essayId is required for essayReview collaborations',
    });
    return;
  }

  // Validate recommendation requires nextActionDueDate
  if (collaborationType === 'recommendation' && !nextActionDueDate) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'nextActionDueDate is required for recommendation collaborations',
    });
    return;
  }

  const collaboration = await collaborationsService.createCollaboration(req.user.userId, {
    collaboratorId,
    applicationId,
    collaborationType,
    status,
    awaitingActionFrom,
    awaitingActionType,
    nextActionDescription,
    nextActionDueDate,
    notes,
    essayId,
    currentDraftVersion,
    feedbackRounds,
    lastFeedbackAt,
    portalUrl,
    sessionType,
    meetingUrl,
    scheduledFor,
  });

  // Convert to camelCase
  const response = toCamelCase(collaboration);

  res.status(201).json(response);
});

/**
 * GET /api/collaborations/:id
 * Get collaboration details
 */
export const getCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  const collaboration = await collaborationsService.getCollaborationById(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(collaboration);

  res.json(response);
});

/**
 * PATCH /api/collaborations/:id
 * Update collaboration
 */
export const updateCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  const {
    status,
    awaitingActionFrom,
    awaitingActionType,
    nextActionDescription,
    nextActionDueDate,
    notes,
    // Essay review tracking (optional)
    essayId,
    currentDraftVersion,
    feedbackRounds,
    lastFeedbackAt,
    portalUrl,
    questionnaireCompleted,
    sessionType,
    meetingUrl,
    scheduledFor,
  } = req.body;

  const collaboration = await collaborationsService.updateCollaboration(
    collaborationId,
    req.user.userId,
    {
      status,
      awaitingActionFrom,
      awaitingActionType,
      nextActionDescription,
      nextActionDueDate,
      notes,
      essayId,
      currentDraftVersion,
      feedbackRounds,
      lastFeedbackAt,
      portalUrl,
      questionnaireCompleted,
      sessionType,
      meetingUrl,
      scheduledFor,
    }
  );

  // Convert to camelCase
  const response = toCamelCase(collaboration);

  res.json(response);
});

/**
 * DELETE /api/collaborations/:id
 * Delete collaboration
 */
export const deleteCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  await collaborationsService.deleteCollaboration(collaborationId, req.user.userId);

  res.status(204).send();
});

/**
 * POST /api/collaborations/:id/history
 * Add history entry to collaboration
 */
export const addCollaborationHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  const { action, details } = req.body;

  if (!action) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'action is required',
    });
    return;
  }

  const historyEntry = await collaborationsService.addCollaborationHistory(
    collaborationId,
    req.user.userId,
    {
      action,
      details,
    }
  );

  // Convert to camelCase
  const response = toCamelCase(historyEntry);

  res.status(201).json(response);
});

/**
 * GET /api/collaborations/:id/history
 * Get collaboration history
 */
export const getCollaborationHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  const history = await collaborationsService.getCollaborationHistory(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = history.map((entry) => toCamelCase(entry));

  res.json(response);
});

/**
 * POST /api/collaborations/:id/invite
 * Send collaboration invitation now
 */
export const sendInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  const invite = await collaborationsService.sendCollaborationInvitation(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(invite);

  res.status(201).json(response);
});

/**
 * POST /api/collaborations/:id/invite/schedule
 * Schedule collaboration invitation for later
 */
export const scheduleInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  const { scheduledFor } = req.body;

  if (!scheduledFor) {
    res.status(400).json({ error: 'scheduledFor is required' });
    return;
  }

  // Validate date
  const scheduledDate = new Date(scheduledFor);
  if (isNaN(scheduledDate.getTime())) {
    res.status(400).json({ error: 'Invalid scheduledFor date' });
    return;
  }

  // Check if scheduled date is in the future
  if (scheduledDate < new Date()) {
    res.status(400).json({ error: 'scheduledFor must be in the future' });
    return;
  }

  const invite = await collaborationsService.scheduleCollaborationInvitation(
    collaborationId,
    req.user.userId,
    scheduledFor
  );

  // Convert to camelCase
  const response = toCamelCase(invite);

  res.status(201).json(response);
});

/**
 * POST /api/collaborations/:id/invite/resend
 * Resend collaboration invitation
 */
export const resendInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborationId = parseInt(req.params.id || '', 10);

  if (isNaN(collaborationId)) {
    res.status(400).json({ error: 'Invalid collaboration ID' });
    return;
  }

  const invite = await collaborationsService.resendCollaborationInvitation(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(invite);

  res.json(response);
});

