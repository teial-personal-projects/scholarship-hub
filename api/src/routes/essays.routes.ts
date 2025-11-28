import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as essaysController from '../controllers/essays.controller.js';

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/essays/:id - Get essay details
router.get('/:id', essaysController.getEssay);

// PATCH /api/essays/:id - Update essay
router.patch('/:id', essaysController.updateEssay);

// DELETE /api/essays/:id - Delete essay
router.delete('/:id', essaysController.deleteEssay);

export default router;

