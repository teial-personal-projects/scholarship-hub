import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as applicationsController from '../controllers/applications.controller.js';
import * as essaysController from '../controllers/essays.controller.js';
import * as collaborationsController from '../controllers/collaborations.controller.js';
import * as recommendationsController from '../controllers/recommendations.controller.js';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/applications - List user's applications
router.get('/', applicationsController.getApplications);

// POST /api/applications - Create new application
router.post('/', applicationsController.createApplication);

// Nested essays routes - must come before /:id route
// GET /api/applications/:applicationId/essays - List essays for an application
router.get('/:applicationId/essays', essaysController.getEssaysByApplication);

// POST /api/applications/:applicationId/essays - Create new essay
router.post('/:applicationId/essays', essaysController.createEssay);

// Nested collaborations routes - must come before /:id route
// GET /api/applications/:applicationId/collaborations - List collaborations for an application
router.get(
  '/:applicationId/collaborations',
  collaborationsController.getCollaborationsByApplication
);

// Nested recommendations routes - must come before /:id route
// GET /api/applications/:applicationId/recommendations - List recommendations for an application
router.get(
  '/:applicationId/recommendations',
  recommendationsController.getRecommendationsByApplication
);

// GET /api/applications/:id - Get application details
router.get('/:id', applicationsController.getApplication);

// PATCH /api/applications/:id - Update application
router.patch('/:id', applicationsController.updateApplication);

// DELETE /api/applications/:id - Delete application
router.delete('/:id', applicationsController.deleteApplication);

export default router;
