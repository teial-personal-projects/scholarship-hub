/**
 * Essays Controller
 * HTTP handlers for essay endpoints
 */

import { Request, Response } from 'express';
import * as essaysService from '../services/essays.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';

/**
 * GET /api/applications/:applicationId/essays
 * Get all essays for an application
 */
export const getEssaysByApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const applicationId = parseInt(req.params.applicationId || '', 10);

  if (isNaN(applicationId)) {
    res.status(400).json({ error: 'Invalid application ID' });
    return;
  }

  const essays = await essaysService.getEssaysByApplicationId(applicationId, req.user.userId);
  const response = essays.map(essay => toCamelCase(essay));

  res.json(response);
});

/**
 * POST /api/applications/:applicationId/essays
 * Create a new essay for an application
 */
export const createEssay = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const applicationId = parseInt(req.params.applicationId || '', 10);

  if (isNaN(applicationId)) {
    res.status(400).json({ error: 'Invalid application ID' });
    return;
  }

  const { theme, units, essayLink, wordCount } = req.body;

  const essay = await essaysService.createEssay(applicationId, req.user.userId, {
    theme,
    units,
    essayLink,
    wordCount,
  });

  const response = toCamelCase(essay);

  res.status(201).json(response);
});

/**
 * GET /api/essays/:id
 * Get a single essay
 */
export const getEssay = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const essayId = parseInt(req.params.id || '', 10);

  if (isNaN(essayId)) {
    res.status(400).json({ error: 'Invalid essay ID' });
    return;
  }

  const essay = await essaysService.getEssayById(essayId, req.user.userId);
  const response = toCamelCase(essay);

  res.json(response);
});

/**
 * PATCH /api/essays/:id
 * Update an essay
 */
export const updateEssay = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const essayId = parseInt(req.params.id || '', 10);

  if (isNaN(essayId)) {
    res.status(400).json({ error: 'Invalid essay ID' });
    return;
  }

  const { theme, units, essayLink, wordCount } = req.body;

  const essay = await essaysService.updateEssay(essayId, req.user.userId, {
    theme,
    units,
    essayLink,
    wordCount,
  });

  const response = toCamelCase(essay);

  res.json(response);
});

/**
 * DELETE /api/essays/:id
 * Delete an essay
 */
export const deleteEssay = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const essayId = parseInt(req.params.id || '', 10);

  if (isNaN(essayId)) {
    res.status(400).json({ error: 'Invalid essay ID' });
    return;
  }

  await essaysService.deleteEssay(essayId, req.user.userId);

  res.status(204).send();
});
