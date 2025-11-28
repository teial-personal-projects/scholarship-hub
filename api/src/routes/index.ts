import { Router } from 'express';
import usersRoutes from './users.routes.js';

const router = Router();

// Mount route modules
router.use('/users', usersRoutes);

// Future routes will be added here:
// router.use('/applications', applicationsRoutes);
// router.use('/essays', essaysRoutes);
// router.use('/collaborators', collaboratorsRoutes);
// router.use('/collaborations', collaborationsRoutes);
// router.use('/recommendations', recommendationsRoutes);

export default router;
