import { Router } from 'express';
import usersRoutes from './users.routes.js';
import applicationsRoutes from './applications.routes.js';
import essaysRoutes from './essays.routes.js';
import collaboratorsRoutes from './collaborators.routes.js';
import collaborationsRoutes from './collaborations.routes.js';
import recommendationsRoutes from './recommendations.routes.js';

const router = Router();

// Mount route modules
router.use('/users', usersRoutes);
router.use('/applications', applicationsRoutes);
router.use('/essays', essaysRoutes);
router.use('/collaborators', collaboratorsRoutes);
router.use('/collaborations', collaborationsRoutes);
router.use('/recommendations', recommendationsRoutes);

export default router;
