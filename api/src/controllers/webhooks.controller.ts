import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { AppError } from '../middleware/error-handler.js';
import * as webhooksService from '../services/webhooks.service.js';

/**
 * POST /api/webhooks/resend
 * Handle Resend webhook events for email delivery status
 * 
 * This endpoint receives webhook events from Resend and updates
 * the collaboration_invites table with delivery status information.
 * 
 * Webhook signature verification is handled by the service layer.
 * The route uses express.raw() middleware to preserve the raw body for signature verification.
 */
export const handleResendWebhook = asyncHandler(async (req: Request, res: Response) => {
  // Get signature headers
  const signature = req.headers['svix-signature'] as string;
  const timestamp = req.headers['svix-timestamp'] as string;
  const svixId = req.headers['svix-id'] as string;

  if (!signature || !timestamp || !svixId) {
    res.status(401).json({ error: 'Missing webhook signature headers' });
    return;
  }

  // req.body is a Buffer from express.raw()
  const rawBody = req.body as Buffer;
  if (!rawBody) {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    // Process the webhook event
    await webhooksService.processResendWebhook(rawBody, {
      signature,
      timestamp,
      svixId,
    });

    // Return 200 OK to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('[webhooks.controller] Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

