/**
 * Recommendations Controller
 * HTTP handlers for recommendation endpoints
 */

import { Request, Response } from 'express';
import * as recommendationsService from '../services/recommendations.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared/utils/case-conversion';

/**
 * GET /api/applications/:applicationId/recommendations
 * Get all recommendations for an application
 */
export const getRecommendationsByApplication = asyncHandler(
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

    const recommendations = await recommendationsService.getRecommendationsByApplicationId(
      applicationId,
      req.user.userId
    );

    // Convert to camelCase
    const response = recommendations.map((rec) => toCamelCase(rec));

    res.json(response);
  }
);

/**
 * POST /api/recommendations
 * Create new recommendation
 */
export const createRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { applicationId, recommenderId, status, submittedAt, dueDate } = req.body;

  // Validate required fields
  if (!applicationId || !recommenderId) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'applicationId and recommenderId are required',
    });
    return;
  }

  const recommendation = await recommendationsService.createRecommendation(req.user.userId, {
    applicationId,
    recommenderId,
    status,
    submittedAt,
    dueDate,
  });

  // Convert to camelCase
  const response = toCamelCase(recommendation);

  res.status(201).json(response);
});

/**
 * GET /api/recommendations/:id
 * Get single recommendation by ID
 */
export const getRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const recommendationId = parseInt(req.params.id || '', 10);

  if (isNaN(recommendationId)) {
    res.status(400).json({ error: 'Invalid recommendation ID' });
    return;
  }

  const recommendation = await recommendationsService.getRecommendationById(
    recommendationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(recommendation);

  res.json(response);
});

/**
 * PATCH /api/recommendations/:id
 * Update recommendation
 */
export const updateRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const recommendationId = parseInt(req.params.id || '', 10);

  if (isNaN(recommendationId)) {
    res.status(400).json({ error: 'Invalid recommendation ID' });
    return;
  }

  const { status, submittedAt, dueDate } = req.body;

  const recommendation = await recommendationsService.updateRecommendation(
    recommendationId,
    req.user.userId,
    {
      status,
      submittedAt,
      dueDate,
    }
  );

  // Convert to camelCase
  const response = toCamelCase(recommendation);

  res.json(response);
});

/**
 * DELETE /api/recommendations/:id
 * Delete recommendation
 */
export const deleteRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const recommendationId = parseInt(req.params.id || '', 10);

  if (isNaN(recommendationId)) {
    res.status(400).json({ error: 'Invalid recommendation ID' });
    return;
  }

  await recommendationsService.deleteRecommendation(recommendationId, req.user.userId);

  res.status(204).send();
});

