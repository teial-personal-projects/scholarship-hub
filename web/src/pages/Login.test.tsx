/**
 * Integration tests for Login page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import Login from './Login';
import { mockSupabaseAuth } from '../test/mocks/supabase';
import * as AuthContext from '../contexts/AuthContext';

// Mock the AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock toast utilities
vi.mock('../utils/toast', () => ({
  useToastHelpers: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Page', () => {
  const mockSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock useAuth to return signIn function
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: mockSignIn,
      signUp: vi.fn(),
      signOut: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with all fields', () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole('heading', { name: /ScholarshipHub/i })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('should render links to register and forgot password', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign up/i })).toBeInTheDocument();
  });

  it('should successfully login with valid credentials', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(undefined);

    renderWithProviders(<Login />);

    // Fill out form
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    // Verify signIn was called with correct credentials
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    // Verify navigation to dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();

    // Make signIn return a promise that doesn't resolve immediately
    let resolveSignIn: () => void;
    const signInPromise = new Promise<void>((resolve) => {
      resolveSignIn = resolve;
    });
    mockSignIn.mockReturnValue(signInPromise);

    renderWithProviders(<Login />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    // Verify loading state
    await waitFor(() => {
      expect(screen.getByText(/Signing in\.\.\./i)).toBeInTheDocument();
    });

    // Resolve the promise
    resolveSignIn!();
  });

  it('should handle login failure with error message', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid email or password';
    mockSignIn.mockRejectedValue(new Error(errorMessage));

    renderWithProviders(<Login />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/Email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    // Verify signIn was called
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });

    // Verify no navigation occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should require email field', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/Email/i);

    // Email field should be required
    expect(emailInput).toBeRequired();
  });

  it('should require password field', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    const passwordInput = screen.getByLabelText(/Password/i);

    // Password field should be required
    expect(passwordInput).toBeRequired();
  });

  it('should have email input type', () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/Email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should have password input type', () => {
    renderWithProviders(<Login />);

    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
