import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/users/me - Get current user profile (includes search preferences)
router.get('/me', usersController.getMe);

// PATCH /api/users/me - Update current user profile
router.patch('/me', usersController.updateMe);

// GET /api/users/me/roles - Get user roles
router.get('/me/roles', usersController.getMyRoles);

// GET /api/users/me/search-preferences - Get search preferences
router.get('/me/search-preferences', usersController.getMySearchPreferences);

// PATCH /api/users/me/search-preferences - Update search preferences
router.patch('/me/search-preferences', usersController.updateMySearchPreferences);

export default router;
