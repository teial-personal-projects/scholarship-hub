/**
 * Integration tests for Register page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import Register from './Register';
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

describe('Register Page', () => {
  const mockSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock useAuth to return signUp function
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: mockSignUp,
      signOut: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render registration form with all fields', () => {
    renderWithProviders(<Register />);

    expect(screen.getByRole('heading', { name: /ScholarshipHub/i })).toBeInTheDocument();
    expect(screen.getByText(/Create your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign up/i })).toBeInTheDocument();
  });

  it('should render link to login page', () => {
    renderWithProviders(<Register />);

    expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('should show password requirements hint', () => {
    renderWithProviders(<Register />);

    expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
  });

  it('should successfully register with valid data', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue(undefined);

    renderWithProviders(<Register />);

    // Fill out form
    await user.type(screen.getByLabelText(/First Name/i), 'John');
    await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
    await user.type(screen.getByLabelText(/Email/i), 'john.doe@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /Sign up/i }));

    // Verify signUp was called with correct data
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('john.doe@example.com', 'password123', 'John', 'Doe');
    });

    // Verify navigation to login
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should show loading state during registration', async () => {
    const user = userEvent.setup();

    // Make signUp return a promise that doesn't resolve immediately
    let resolveSignUp: () => void;
    const signUpPromise = new Promise<void>((resolve) => {
      resolveSignUp = resolve;
    });
    mockSignUp.mockReturnValue(signUpPromise);

    renderWithProviders(<Register />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/First Name/i), 'John');
    await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
    await user.type(screen.getByLabelText(/Email/i), 'john.doe@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign up/i }));

    // Verify loading state
    await waitFor(() => {
      expect(screen.getByText(/Creating account\.\.\./i)).toBeInTheDocument();
    });

    // Resolve the promise
    resolveSignUp!();
  });

  it('should handle registration failure with error message', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email already registered';
    mockSignUp.mockRejectedValue(new Error(errorMessage));

    renderWithProviders(<Register />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/First Name/i), 'John');
    await user.type(screen.getByLabelText(/Last Name/i), 'Doe');
    await user.type(screen.getByLabelText(/Email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign up/i }));

    // Verify signUp was called
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });

    // Verify no navigation occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should require all fields', () => {
    renderWithProviders(<Register />);

    expect(screen.getByLabelText(/First Name/i)).toBeRequired();
    expect(screen.getByLabelText(/Last Name/i)).toBeRequired();
    expect(screen.getByLabelText(/Email/i)).toBeRequired();
    expect(screen.getByLabelText(/Password/i)).toBeRequired();
  });

  it('should have correct input types', () => {
    renderWithProviders(<Register />);

    expect(screen.getByLabelText(/First Name/i)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/Last Name/i)).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/Email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/Password/i)).toHaveAttribute('type', 'password');
  });

  it('should have appropriate placeholders', () => {
    renderWithProviders(<Register />);

    expect(screen.getByPlaceholderText(/John/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Doe/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Create a strong password/i)).toBeInTheDocument();
  });
});
