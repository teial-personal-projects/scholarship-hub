import { Request, Response, NextFunction } from 'express';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Catches all errors and sends consistent error responses
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  // Handle Supabase/PostgreSQL errors
  else if ('code' in err) {
    const pgError = err as { code: string; message: string };
    switch (pgError.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message = 'Resource already exists';
        isOperational = true;
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Invalid reference to related resource';
        isOperational = true;
        break;
      case '23502': // Not null violation
        statusCode = 400;
        message = 'Required field is missing';
        isOperational = true;
        break;
      case 'PGRST116': // Supabase: No rows found
        statusCode = 404;
        message = 'Resource not found';
        isOperational = true;
        break;
      default:
        message = pgError.message || message;
    }
  }
  // Handle validation errors (will add Zod errors later)
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
  }

  // Log error for debugging (only log unexpected errors in production)
  if (!isOperational || process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isOperational ? message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
