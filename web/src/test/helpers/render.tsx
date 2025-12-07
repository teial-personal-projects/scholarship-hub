/**
 * Custom render utilities for testing React components
 * Provides components wrapped with necessary providers
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';

/**
 * Custom render function that wraps components with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ChakraProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ChakraProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Render with authenticated user context
 * Mocks localStorage with auth token
 */
export function renderWithAuth(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    user?: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }
) {
  const mockUser = options?.user || {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  // Mock localStorage with auth token
  const mockToken = 'mock-jwt-token';
  localStorage.setItem('supabase.auth.token', JSON.stringify({
    access_token: mockToken,
    refresh_token: 'mock-refresh-token',
  }));

  // Mock user data in localStorage
  localStorage.setItem('user', JSON.stringify(mockUser));

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ChakraProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ChakraProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Helper to clean up after tests
 */
export function cleanupAuth() {
  localStorage.clear();
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
