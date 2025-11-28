import { Request, Response } from 'express';
import * as usersService from '../services/users.service.js';
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

  const { firstName, lastName, phoneNumber } = req.body;

  const updated = await usersService.updateUserProfile(req.user.userId, {
    firstName,
    lastName,
    phoneNumber,
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
