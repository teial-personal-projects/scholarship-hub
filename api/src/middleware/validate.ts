import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validation middleware using Zod schemas
 * Validates request body, query params, and route params
 *
 * Usage:
 *   router.post('/path', validate(mySchema), controller)
 */
export const validate = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request data
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into user-friendly messages
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          errors,
        });
        return;
      }

      // Pass other errors to error handler
      next(error);
    }
  };
};

/**
 * Validate only request body
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request body',
          errors,
        });
        return;
      }

      next(error);
    }
  };
};

/**
 * Validate only query parameters
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          errors,
        });
        return;
      }

      next(error);
    }
  };
};
