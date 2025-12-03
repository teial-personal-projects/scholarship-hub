import { Router } from 'express';
import express from 'express';
import * as webhooksController from '../controllers/webhooks.controller.js';

const router = Router();

// Webhook routes - NO auth middleware (webhooks use signature verification instead)
// Use raw body parser for signature verification (Svix needs raw body)
// POST /api/webhooks/resend - Handle Resend webhook events
router.post(
  '/resend',
  express.raw({ type: 'application/json' }),
  webhooksController.handleResendWebhook
);

export default router;

