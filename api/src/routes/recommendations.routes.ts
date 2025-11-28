import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as recommendationsController from '../controllers/recommendations.controller.js';

const router = Router();

// All routes require authentication
router.use(auth);

// POST /api/recommendations - Create new recommendation
router.post('/', recommendationsController.createRecommendation);

// GET /api/recommendations/:id - Get recommendation details
router.get('/:id', recommendationsController.getRecommendation);

// PATCH /api/recommendations/:id - Update recommendation
router.patch('/:id', recommendationsController.updateRecommendation);

// DELETE /api/recommendations/:id - Delete recommendation
router.delete('/:id', recommendationsController.deleteRecommendation);

export default router;

