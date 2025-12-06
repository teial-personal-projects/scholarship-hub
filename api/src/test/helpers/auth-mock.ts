/**
 * Auth Mock Helper
 * Provides mock authentication utilities for testing
 */

import { vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

/**
 * Mock user for testing
 */
export interface MockUser {
  userId: number;
  authUserId: string;
  email: string;
}

/**
 * Generate a mock JWT token (for testing only)
 */
export const generateMockToken = (userId: number = 1, authUserId: string = 'test-auth-user-id'): string => {
  // In tests, we don't need real JWT encoding, just a mock token
  return `mock-jwt-token-${userId}-${authUserId}`;
};

/**
 * Create a mock authenticated user
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  userId: 1,
  authUserId: 'test-auth-user-id',
  email: 'test@example.com',
  ...overrides,
});

/**
 * Mock authentication middleware
 * Attaches a mock user to req.user
 */
export const mockAuthMiddleware = (user: MockUser = createMockUser()) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.user = user;
    next();
  };
};

/**
 * Create a mock Express request with authentication
 */
export const createMockAuthRequest = (overrides: Partial<Request> = {}, user: MockUser = createMockUser()): Partial<Request> => ({
  user,
  headers: {
    authorization: `Bearer ${generateMockToken(user.userId, user.authUserId)}`,
  },
  ...overrides,
});

/**
 * Create a mock Express response
 */
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Create a mock next function
 */
export const createMockNext = (): NextFunction => {
  return vi.fn();
};

/**
 * Mock Supabase auth helpers
 */
export const mockSupabaseAuth = {
  /**
   * Mock successful authentication
   */
  success: (user: { id: string; email: string } = { id: 'test-auth-user-id', email: 'test@example.com' }) => ({
    data: {
      user,
      session: {
        access_token: generateMockToken(),
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      },
    },
    error: null,
  }),

  /**
   * Mock failed authentication
   */
  failure: (message: string = 'Invalid credentials') => ({
    data: { user: null, session: null },
    error: {
      message,
      status: 401,
    },
  }),

  /**
   * Mock getUser response
   */
  getUser: (user: { id: string; email: string } = { id: 'test-auth-user-id', email: 'test@example.com' }) => ({
    data: { user },
    error: null,
  }),
};
