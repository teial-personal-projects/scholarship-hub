/**
 * Collaborators Controller
 * HTTP handlers for collaborator endpoints
 */

import { Request, Response } from 'express';
import * as collaboratorsService from '../services/collaborators.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared/utils/case-conversion';

/**
 * GET /api/collaborators
 * Get all collaborators for current user
 */
export const getCollaborators = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaborators = await collaboratorsService.getUserCollaborators(req.user.userId);

  // Convert to camelCase
  const response = collaborators.map((collab) => toCamelCase(collab));

  res.json(response);
});

/**
 * GET /api/collaborators/:id
 * Get single collaborator by ID
 */
export const getCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaboratorId = parseInt(req.params.id || '', 10);

  if (isNaN(collaboratorId)) {
    res.status(400).json({ error: 'Invalid collaborator ID' });
    return;
  }

  const collaborator = await collaboratorsService.getCollaboratorById(
    collaboratorId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(collaborator);

  res.json(response);
});

/**
 * POST /api/collaborators
 * Create new collaborator
 */
export const createCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { firstName, lastName, emailAddress, relationship, phoneNumber } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !emailAddress) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'firstName, lastName, and emailAddress are required',
    });
    return;
  }

  const collaborator = await collaboratorsService.createCollaborator(req.user.userId, {
    firstName,
    lastName,
    emailAddress,
    relationship,
    phoneNumber,
  });

  // Convert to camelCase
  const response = toCamelCase(collaborator);

  res.status(201).json(response);
});

/**
 * PATCH /api/collaborators/:id
 * Update collaborator
 */
export const updateCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaboratorId = parseInt(req.params.id || '', 10);

  if (isNaN(collaboratorId)) {
    res.status(400).json({ error: 'Invalid collaborator ID' });
    return;
  }

  const { firstName, lastName, emailAddress, relationship, phoneNumber } = req.body;

  const collaborator = await collaboratorsService.updateCollaborator(
    collaboratorId,
    req.user.userId,
    {
      firstName,
      lastName,
      emailAddress,
      relationship,
      phoneNumber,
    }
  );

  // Convert to camelCase
  const response = toCamelCase(collaborator);

  res.json(response);
});

/**
 * DELETE /api/collaborators/:id
 * Delete collaborator
 */
export const deleteCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collaboratorId = parseInt(req.params.id || '', 10);

  if (isNaN(collaboratorId)) {
    res.status(400).json({ error: 'Invalid collaborator ID' });
    return;
  }

  await collaboratorsService.deleteCollaborator(collaboratorId, req.user.userId);

  res.status(204).send();
});

