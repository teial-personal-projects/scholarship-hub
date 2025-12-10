/**
 * Scholarship API Routes
 */
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  searchScholarships,
  getScholarshipById,
  getRecommendedScholarships,
  saveScholarship,
  dismissScholarship,
  markScholarshipViewed,
  getSavedScholarships
} from '../services/scholarships.service.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// All routes require authentication and student role
router.use(auth);
router.use(requireRole(['student']));

/**
 * GET /api/scholarships/search
 * Search scholarships with filters
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = {
      query: req.query.q as string,
      category: req.query.category as string,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
      deadlineBefore: req.query.deadlineBefore as string,
      educationLevel: req.query.educationLevel as string,
      fieldOfStudy: req.query.fieldOfStudy as string,
      targetType: req.query.targetType as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const scholarships = await searchScholarships(params, req.user?.userId);
    res.json(scholarships);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scholarships/recommended
 * Get personalized recommendations
 */
router.get('/recommended', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const scholarships = await getRecommendedScholarships(req.user!.userId, limit);
    res.json(scholarships);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scholarships/saved
 * Get user's saved scholarships
 */
router.get('/saved', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scholarships = await getSavedScholarships(req.user!.userId);
    res.json(scholarships);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scholarships/:id
 * Get scholarship by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const scholarship = await getScholarshipById(id);

    // Mark as viewed
    if (req.user) {
      await markScholarshipViewed(req.user.userId, id);
    }

    res.json(scholarship);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scholarships/:id/save
 * Save scholarship to user's list
 */
router.post('/:id/save', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const matchScore = req.body.matchScore;

    await saveScholarship(req.user!.userId, id, matchScore);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scholarships/:id/dismiss
 * Dismiss scholarship (hide from recommendations)
 */
router.post('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    await dismissScholarship(req.user!.userId, id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
