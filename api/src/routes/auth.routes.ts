import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user (proxy to Supabase Auth)
router.post('/login', authController.login);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

// POST /api/auth/refresh - Refresh session token
router.post('/refresh', authController.refresh);

export default router;

