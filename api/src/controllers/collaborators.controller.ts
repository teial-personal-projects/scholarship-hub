/**
 * Collaborators Controller
 * HTTP handlers for collaborator endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as collaboratorsService from '../services/collaborators.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared/utils/case-conversion';
import { emailSchema, nameSchema } from '@scholarship-hub/shared/utils/validation';

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

// Validation schemas
// NOTE: Collaborator phone numbers are optional and frequently entered as placeholders
// (e.g. (555) 555-5555) during development. We accept any trimmed string here and let
// the service normalize to E.164 when possible.
const collaboratorPhoneSchema = z
  .union([z.string().trim().max(50), z.null()])
  .optional();

const createCollaboratorSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  emailAddress: emailSchema,
  relationship: z.string().max(100).trim().optional(),
  phoneNumber: collaboratorPhoneSchema,
});

const updateCollaboratorSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  emailAddress: emailSchema.optional(),
  relationship: z.string().max(100).trim().optional(),
  phoneNumber: collaboratorPhoneSchema,
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

  // Validate request body
  const validationResult = createCollaboratorSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ createCollaborator validation failed', {
        body: req.body,
        issues: validationResult.error.issues,
      });
    }
    res.status(400).json({
      error: 'Validation Error',
      message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
    return;
  }

  const { firstName, lastName, emailAddress, relationship, phoneNumber } = validationResult.data;

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

  // Validate request body
  const validationResult = updateCollaboratorSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ updateCollaborator validation failed', {
        body: req.body,
        issues: validationResult.error.issues,
      });
    }
    res.status(400).json({
      error: 'Validation Error',
      message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
    return;
  }

  const { firstName, lastName, emailAddress, relationship, phoneNumber } = validationResult.data;
  // Preserve explicit "clear" requests. `phoneSchema` transforms null/empty → undefined,
  // but callers intentionally send null to clear an existing number.
  const hasPhoneNumberKey = Object.prototype.hasOwnProperty.call(req.body, 'phoneNumber');
  const rawPhoneNumber = (req.body as any).phoneNumber;
  const phoneNumberUpdate =
    hasPhoneNumberKey && (rawPhoneNumber === null || rawPhoneNumber === '')
      ? null
      : phoneNumber;

  const collaborator = await collaboratorsService.updateCollaborator(
    collaboratorId,
    req.user.userId,
    {
      firstName,
      lastName,
      emailAddress,
      relationship,
      phoneNumber: phoneNumberUpdate,
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

