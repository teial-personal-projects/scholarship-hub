import { Router } from 'express';
import usersRoutes from './users.routes.js';
import applicationsRoutes from './applications.routes.js';

const router = Router();

// Mount route modules
router.use('/users', usersRoutes);
router.use('/applications', applicationsRoutes);

// Future routes will be added here:
// router.use('/essays', essaysRoutes);
// router.use('/collaborators', collaboratorsRoutes);
// router.use('/collaborations', collaborationsRoutes);
// router.use('/recommendations', recommendationsRoutes);

export default router;
