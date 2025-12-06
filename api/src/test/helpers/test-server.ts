/**
 * Test Server Helper
 * Utilities for spinning up Express app for integration tests
 */

import express, { Express } from 'express';
import request from 'supertest';
import { vi } from 'vitest';

/**
 * Create a test Express app with minimal configuration
 */
export const createTestApp = (): Express => {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
};

/**
 * Create supertest agent for testing
 */
export const createTestAgent = (app: Express) => {
  return request(app);
};

/**
 * Mock database cleanup utilities
 * In real tests, these would clean up test data from the database
 */
export const dbTestHelpers = {
  /**
   * Clean up all test data
   */
  cleanup: vi.fn(async () => {
    // In a real implementation, this would:
    // - Delete all test records from database
    // - Reset sequences/auto-increment IDs
    // - Clear any cached data
    return Promise.resolve();
  }),

  /**
   * Set up test data
   */
  seed: vi.fn(async (data: any) => {
    // In a real implementation, this would:
    // - Insert seed data into database
    // - Return the inserted records
    return Promise.resolve(data);
  }),

  /**
   * Reset database to clean state
   */
  reset: vi.fn(async () => {
    // In a real implementation, this would:
    // - Truncate all tables
    // - Reset sequences
    // - Re-apply migrations if needed
    return Promise.resolve();
  }),
};

/**
 * Test helper for authenticated requests
 */
export const authenticatedRequest = (
  agent: ReturnType<typeof request>,
  token: string = 'mock-jwt-token'
) => {
  return {
    get: (url: string) => agent.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => agent.post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => agent.patch(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => agent.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => agent.delete(url).set('Authorization', `Bearer ${token}`),
  };
};

/**
 * Test helper for expecting common HTTP responses
 */
export const expectSuccess = (response: request.Response, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeDefined();
};

export const expectError = (
  response: request.Response,
  expectedStatus: number,
  errorMessage?: string
) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.error).toBeDefined();
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
};

/**
 * Wait for async operations
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
