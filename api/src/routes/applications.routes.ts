import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as applicationsController from '../controllers/applications.controller.js';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/applications - List user's applications
router.get('/', applicationsController.getApplications);

// POST /api/applications - Create new application
router.post('/', applicationsController.createApplication);

// GET /api/applications/:id - Get application details
router.get('/:id', applicationsController.getApplication);

// PATCH /api/applications/:id - Update application
router.patch('/:id', applicationsController.updateApplication);

// DELETE /api/applications/:id - Delete application
router.delete('/:id', applicationsController.deleteApplication);

export default router;
