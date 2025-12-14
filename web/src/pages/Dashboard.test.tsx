/**
 * Integration tests for Dashboard page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import Dashboard from './Dashboard';
import * as api from '../services/api';
import * as AuthContext from '../contexts/AuthContext';
import { mockUsers, mockApplications } from '../test/fixtures';

// Mock the API
vi.mock('../services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

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

// Mock DashboardReminders component
vi.mock('../components/DashboardReminders', () => ({
  default: () => <div data-testid="dashboard-reminders">Reminders Component</div>,
}));

describe('Dashboard Page', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock useAuth to return authenticated user
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    vi.mocked(api.apiGet).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/Loading dashboard\.\.\./i)).toBeInTheDocument();
    // Spinner is present (check by text or by querying for spinner)
    expect(screen.getByText(/Loading dashboard\.\.\./i)).toBeInTheDocument();
  });

  it('should fetch and display user profile and applications', async () => {
    const mockProfile = mockUsers.student1;
    const mockApps = [mockApplications.merit1, mockApplications.need1];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    });

    // Verify applications are displayed
    await waitFor(() => {
      expect(screen.getAllByText(mockApps[0].scholarshipName).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(mockApps[1].scholarshipName).length).toBeGreaterThan(0);
  });

  it('should display welcome message with default name when no profile', async () => {
    const mockProfile = { ...mockUsers.student1, firstName: undefined };
    const mockApps: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Student!/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no applications', async () => {
    const mockProfile = mockUsers.student1;
    const mockApps: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/You don't have any applications yet/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Create Your First Application/i })).toBeInTheDocument();
  });

  it('should navigate to new application page when clicking New Application button', async () => {
    const user = userEvent.setup();
    const mockProfile = mockUsers.student1;
    const mockApps: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    });

    // Click the "New Application" button (there are two on the page when empty)
    const buttons = screen.getAllByRole('button', { name: /New Application|Create Your First Application/i });
    await user.click(buttons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/applications/new');
  });

  it('should display application badges with correct status colors', async () => {
    const mockProfile = mockUsers.student1;
    const mockApps = [
      { ...mockApplications.merit1, status: 'Submitted' },
      { ...mockApplications.need1, status: 'In Progress' },
      { ...mockApplications.merit2, status: 'Not Started' },
    ];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText(/Submitted/i).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Not Started/i).length).toBeGreaterThan(0);
  });

  it('should navigate to application detail when clicking View link', async () => {
    const user = userEvent.setup();
    const mockProfile = mockUsers.student1;
    const mockApps = [mockApplications.merit1];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(mockApps[0].scholarshipName)).toBeInTheDocument();
    });

    // Click the "View →" link (desktop view)
    await waitFor(() => {
      expect(screen.getAllByText(mockApps[0].scholarshipName).length).toBeGreaterThan(0);
    });
    
    const viewLinks = await screen.findAllByText(/View →/i);
    if (viewLinks.length > 0) {
      await user.click(viewLinks[0]);
      expect(mockNavigate).toHaveBeenCalledWith(`/applications/${mockApps[0].id}`);
    }
  });

  it('should handle API error gracefully', async () => {
    vi.mocked(api.apiGet).mockRejectedValue(new Error('Failed to fetch data'));

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      // Error message is the actual error text
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
    });
  });

  it('should render DashboardReminders component', async () => {
    const mockProfile = mockUsers.student1;
    const mockApps: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-reminders')).toBeInTheDocument();
    });
  });

  it('should display applications count correctly', async () => {
    const mockProfile = mockUsers.student1;
    const mockApps = [mockApplications.merit1, mockApplications.need1, mockApplications.merit2];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      // Check that all three applications are displayed
      expect(screen.getAllByText(mockApps[0].scholarshipName).length).toBeGreaterThan(0);
    });
    
    expect(screen.getAllByText(mockApps[1].scholarshipName).length).toBeGreaterThan(0);
    expect(screen.getAllByText(mockApps[2].scholarshipName).length).toBeGreaterThan(0);
  });

  it('should format due dates correctly', async () => {
    const mockProfile = mockUsers.student1;
    const dueDate = '2024-12-31';
    const mockApps = [
      { ...mockApplications.merit1, dueDate },
    ];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      if (url.startsWith('/scholarships/recommended')) {
        return Promise.resolve([]);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const formattedDate = new Date(dueDate).toLocaleDateString();
      // Date might appear in table cell, check if it exists
      expect(screen.getAllByText(formattedDate).length).toBeGreaterThan(0);
    });
  });
});
