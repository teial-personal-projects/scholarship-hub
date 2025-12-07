import { Request, Response } from 'express';
import { z } from 'zod';
import * as usersService from '../services/users.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared/utils/case-conversion';
import { nameSchema, phoneSchema } from '@scholarship-hub/shared/utils/validation';

// Validation schemas
const updateUserProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phoneNumber: phoneSchema().optional(),
  applicationRemindersEnabled: z.boolean().optional(),
  collaborationRemindersEnabled: z.boolean().optional(),
});

/**
 * GET /api/users/me
 * Get current user profile (includes search preferences)
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const profile = await usersService.getUserProfile(req.user.userId);

  // Convert to camelCase for API response
  const response = {
    ...toCamelCase(profile),
    searchPreferences: profile.searchPreferences
      ? toCamelCase(profile.searchPreferences)
      : null,
  };

  res.json(response);
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = updateUserProfileSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    res.status(400).json({
      error: 'Validation Error',
      message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
    return;
  }

  const { firstName, lastName, phoneNumber, applicationRemindersEnabled, collaborationRemindersEnabled } = validationResult.data;

  const updated = await usersService.updateUserProfile(req.user.userId, {
    firstName,
    lastName,
    phoneNumber,
    applicationRemindersEnabled,
    collaborationRemindersEnabled,
  });

  // Convert to camelCase
  const response = toCamelCase(updated);

  res.json(response);
});

/**
 * GET /api/users/me/roles
 * Get current user's roles
 */
export const getMyRoles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const roles = await usersService.getUserRoles(req.user.userId);

  res.json({ roles });
});

/**
 * GET /api/users/me/search-preferences
 * Get current user's search preferences
 */
export const getMySearchPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const prefs = await usersService.getUserSearchPreferences(req.user.userId);

    if (!prefs) {
      res.json(null);
      return;
    }

    // Convert to camelCase
    const response = toCamelCase(prefs);

    res.json(response);
  }
);

/**
 * PATCH /api/users/me/search-preferences
 * Update current user's search preferences
 */
export const updateMySearchPreferences = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      targetType,
      subjectAreas,
      gender,
      ethnicity,
      minAward,
      geographicRestrictions,
      essayRequired,
      recommendationRequired,
      academicLevel,
    } = req.body;

    const updated = await usersService.updateUserSearchPreferences(
      req.user.userId,
      {
        targetType,
        subjectAreas,
        gender,
        ethnicity,
        minAward,
        geographicRestrictions,
        essayRequired,
        recommendationRequired,
        academicLevel,
      }
    );

    // Convert to camelCase
    const response = toCamelCase(updated);

    res.json(response);
  }
);

/**
 * GET /api/users/me/reminders
 * Get dashboard reminders for current user
 */
export const getMyReminders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const reminders = await usersService.getUserReminders(req.user.userId);

  // Convert to camelCase for API response
  const response = {
    applications: {
      dueSoon: reminders.applications.dueSoon.map(app => toCamelCase(app)),
      overdue: reminders.applications.overdue.map(app => toCamelCase(app)),
    },
    collaborations: {
      pendingResponse: reminders.collaborations.pendingResponse.map(collab => toCamelCase(collab)),
      dueSoon: reminders.collaborations.dueSoon.map(collab => toCamelCase(collab)),
      overdue: reminders.collaborations.overdue.map(collab => toCamelCase(collab)),
    },
    stats: reminders.stats,
  };

  res.json(response);
});
