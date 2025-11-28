import { Router } from 'express';
import usersRoutes from './users.routes.js';
import applicationsRoutes from './applications.routes.js';
import essaysRoutes from './essays.routes.js';

const router = Router();

// Mount route modules
router.use('/users', usersRoutes);
router.use('/applications', applicationsRoutes);
router.use('/essays', essaysRoutes);

// Future routes will be added here:
// router.use('/collaborators', collaboratorsRoutes);
// router.use('/collaborations', collaborationsRoutes);
// router.use('/recommendations', recommendationsRoutes);

export default router;
