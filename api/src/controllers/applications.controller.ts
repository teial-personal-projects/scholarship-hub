import { Request, Response } from 'express';
import * as applicationsService from '../services/applications.service.js';
import { asyncHandler } from '../middleware/error-handler.js';

/**
 * Convert database snake_case to API camelCase
 */
const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }

  return result;
};

/**
 * GET /api/applications
 * Get all applications for current user
 */
export const getApplications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const applications = await applicationsService.getUserApplications(req.user.userId);

  // Convert to camelCase
  const response = applications.map((app) => toCamelCase(app));

  res.json(response);
});

/**
 * GET /api/applications/:id
 * Get single application by ID
 */
export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const applicationId = parseInt(req.params.id || '', 10);

  if (isNaN(applicationId)) {
    res.status(400).json({ error: 'Invalid application ID' });
    return;
  }

  const application = await applicationsService.getApplicationById(
    applicationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(application);

  res.json(response);
});

/**
 * POST /api/applications
 * Create new application
 */
export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const {
    scholarshipName,
    targetType,
    organization,
    orgWebsite,
    platform,
    applicationLink,
    theme,
    minAward,
    maxAward,
    requirements,
    renewable,
    renewableTerms,
    documentInfoLink,
    currentAction,
    status,
    submissionDate,
    openDate,
    dueDate,
  } = req.body;

  // Validate required fields
  if (!scholarshipName || !dueDate) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'scholarshipName and dueDate are required',
    });
    return;
  }

  const application = await applicationsService.createApplication(req.user.userId, {
    scholarshipName,
    targetType,
    organization,
    orgWebsite,
    platform,
    applicationLink,
    theme,
    minAward,
    maxAward,
    requirements,
    renewable,
    renewableTerms,
    documentInfoLink,
    currentAction,
    status,
    submissionDate,
    openDate,
    dueDate,
  });

  // Convert to camelCase
  const response = toCamelCase(application);

  res.status(201).json(response);
});

/**
 * PATCH /api/applications/:id
 * Update application
 */
export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const applicationId = parseInt(req.params.id || '', 10);

  if (isNaN(applicationId)) {
    res.status(400).json({ error: 'Invalid application ID' });
    return;
  }

  const {
    scholarshipName,
    targetType,
    organization,
    orgWebsite,
    platform,
    applicationLink,
    theme,
    minAward,
    maxAward,
    requirements,
    renewable,
    renewableTerms,
    documentInfoLink,
    currentAction,
    status,
    submissionDate,
    openDate,
    dueDate,
  } = req.body;

  const application = await applicationsService.updateApplication(
    applicationId,
    req.user.userId,
    {
      scholarshipName,
      targetType,
      organization,
      orgWebsite,
      platform,
      applicationLink,
      theme,
      minAward,
      maxAward,
      requirements,
      renewable,
      renewableTerms,
      documentInfoLink,
      currentAction,
      status,
      submissionDate,
      openDate,
      dueDate,
    }
  );

  // Convert to camelCase
  const response = toCamelCase(application);

  res.json(response);
});

/**
 * DELETE /api/applications/:id
 * Delete application
 */
export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const applicationId = parseInt(req.params.id || '', 10);

  if (isNaN(applicationId)) {
    res.status(400).json({ error: 'Invalid application ID' });
    return;
  }

  await applicationsService.deleteApplication(applicationId, req.user.userId);

  res.status(204).send();
});
