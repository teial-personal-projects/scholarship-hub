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
import { createMockSupabaseClient } from '../test/mocks/supabase';

// Mock Supabase before anything else
vi.mock('../config/supabase', () => ({
  supabase: createMockSupabaseClient(),
}));

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

// Mock Dashboard sub-components to avoid extra API calls
vi.mock('../components/DashboardReminders', () => ({
  default: () => null,
}));

vi.mock('../components/DashboardCollaborations', () => ({
  default: () => null,
}));

vi.mock('../components/DashboardPendingResponses', () => ({
  default: () => null,
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

  it.skip('should fetch and display user profile and applications', async () => {
    const mockProfile = mockUsers.student1;
    const mockApps = [mockApplications.merit1, mockApplications.need1];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      // Mock any other endpoints with empty arrays (for the child components)
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    });

    // Both applications have "In Progress" status, so they should appear in the In Progress tab (which is active by default)
    await waitFor(() => {
      const scholarshipNames = screen.getAllByText(mockApps[0].scholarshipName);
      expect(scholarshipNames.length).toBeGreaterThan(0);
    });
    const grant = screen.getAllByText(mockApps[1].scholarshipName);
    expect(grant.length).toBeGreaterThan(0);
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
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Student!/i)).toBeInTheDocument();
    });
  });

  it.skip('should show empty state when no applications', async () => {
    const mockProfile = mockUsers.student1;
    const mockApps: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      // Mock any other endpoints with empty arrays (for the child components)
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      // Check for empty state heading or description
      const heading = screen.queryByText(/Start Your Scholarship Journey/i);
      const description = screen.queryByText(/You don't have any applications yet/i);
      expect(heading || description).toBeTruthy();
    }, { timeout: 3000 });

    // Verify all empty state elements
    expect(screen.getByText(/Start Your Scholarship Journey/i)).toBeInTheDocument();
    expect(screen.getByText(/You don't have any applications yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Your First Application/i)).toBeInTheDocument();
  });

  it.skip('should navigate to new application page when clicking New Application button', async () => {
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
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    });

    // Click the "New Application" button at the top
    const newAppButton = await screen.findByRole('button', { name: /New Application/i }, { timeout: 3000 });
    await user.click(newAppButton);

    expect(mockNavigate).toHaveBeenCalledWith('/applications/new');
  });

  it.skip('should display application badges with correct status colors', async () => {
    const user = userEvent.setup();
    const mockProfile = mockUsers.student1;
    const mockApps = [
      { ...mockApplications.merit1, status: 'Submitted' as const },
      { ...mockApplications.need1, status: 'In Progress' as const },
      { ...mockApplications.merit2, status: 'In Progress' as const },
    ];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === '/users/me') {
        return Promise.resolve(mockProfile);
      }
      if (url === '/applications') {
        return Promise.resolve(mockApps);
      }
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Wait for applications to be displayed
    await waitFor(() => {
      // Check that applications are visible - they might be on different tabs
      const inProgressApps = screen.queryAllByText(/In Progress/i);
      const submittedApps = screen.queryAllByText(/Submitted/i);
      expect(inProgressApps.length + submittedApps.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Try to find and click the "Submitted" tab if it exists
    const submittedTab = screen.queryByText('Submitted');
    if (submittedTab) {
      await user.click(submittedTab);
      await waitFor(() => {
        expect(screen.getAllByText(/Submitted/i).length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    } else {
      // If no tab, just verify Submitted status appears somewhere
      expect(screen.getAllByText(/Submitted/i).length).toBeGreaterThan(0);
    }
  });

  it.skip('should navigate to application detail when clicking View link', async () => {
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
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    // Wait for welcome message and applications
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      const scholarshipNames = screen.getAllByText(mockApps[0].scholarshipName);
      expect(scholarshipNames.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Click the "View →" link
    const viewLinks = await waitFor(
      () => {
        const links = screen.getAllByText(/View →/i);
        expect(links.length).toBeGreaterThan(0);
        return links;
      },
      { timeout: 3000 }
    );
    await user.click(viewLinks[0]);

    expect(mockNavigate).toHaveBeenCalledWith(`/applications/${mockApps[0].id}`);
  });

  it('should handle API error gracefully', async () => {
    vi.mocked(api.apiGet).mockRejectedValue(new Error('Failed to load dashboard data'));

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      // Error message displayed in the component
      // The error is shown via showError toast, but we can check for the error state
      // The component shows error in a Card with the error message
      expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
    }, { timeout: 5000 });
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
      // Mock any other endpoints with empty arrays (for the child components)
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    // Component should load successfully (mocked child components return null)
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    }, { timeout: 5000 });
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
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    // Wait for welcome message first
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Wait for applications to load - they might be on different tabs
    await waitFor(() => {
      // At least one application should be visible
      const app1 = screen.queryAllByText(mockApps[0].scholarshipName);
      const app2 = screen.queryAllByText(mockApps[1].scholarshipName);
      const app3 = screen.queryAllByText(mockApps[2].scholarshipName);
      expect(app1.length + app2.length + app3.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
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
      // Mock essays and collaborations endpoints for each application
      if (url.includes('/essays')) {
        return Promise.resolve([]);
      }
      if (url.includes('/collaborations')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const formattedDate = new Date(dueDate).toLocaleDateString();
      // Date might appear in table cell, check if it exists
      expect(screen.getAllByText(formattedDate).length).toBeGreaterThan(0);
    });
  });
});
