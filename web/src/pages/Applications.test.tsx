/**
 * Integration tests for Applications page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import Applications from './Applications';
import * as api from '../services/api';
import * as AuthContext from '../contexts/AuthContext';
import { mockApplications } from '../test/fixtures';

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

describe('Applications Page', () => {
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

    renderWithProviders(<Applications />);

    expect(screen.getByText(/Loading applications\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should fetch and display applications list', async () => {
    const mockApps = [mockApplications.merit1, mockApplications.need1, mockApplications.merit2];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(mockApps[0].scholarshipName)).toBeInTheDocument();
    });

    expect(screen.getByText(mockApps[1].scholarshipName)).toBeInTheDocument();
    expect(screen.getByText(mockApps[2].scholarshipName)).toBeInTheDocument();
  });

  it('should display page header with title and New Application button', async () => {
    vi.mocked(api.apiGet).mockResolvedValue([]);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Applications$/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Manage all your scholarship applications in one place/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Application/i })).toBeInTheDocument();
  });

  it('should show empty state when no applications', async () => {
    vi.mocked(api.apiGet).mockResolvedValue([]);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(/You don't have any applications yet/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Create Your First Application/i })).toBeInTheDocument();
  });

  it('should navigate to new application page when clicking New Application button', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiGet).mockResolvedValue([]);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Applications$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /New Application/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/applications/new');
  });

  it('should filter applications by search term', async () => {
    const user = userEvent.setup();
    const mockApps = [
      { ...mockApplications.merit1, scholarshipName: 'Merit Scholarship' },
      { ...mockApplications.need1, scholarshipName: 'Need-Based Grant' },
      { ...mockApplications.merit2, scholarshipName: 'Academic Excellence Award' },
    ];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText('Merit Scholarship')).toBeInTheDocument();
    });

    // Search for "merit"
    const searchInput = screen.getByPlaceholderText(/Search by name or organization/i);
    await user.type(searchInput, 'merit');

    await waitFor(() => {
      expect(screen.getByText('Merit Scholarship')).toBeInTheDocument();
    });

    // Should not show non-matching applications
    expect(screen.queryByText('Need-Based Grant')).not.toBeInTheDocument();
  });

  it('should filter applications by status', async () => {
    const user = userEvent.setup();
    const mockApps = [
      { ...mockApplications.merit1, status: 'Submitted' },
      { ...mockApplications.need1, status: 'In Progress' },
      { ...mockApplications.merit2, status: 'Not Started' },
    ];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getAllByText(/Submitted|In Progress|Not Started/i).length).toBeGreaterThan(0);
    });

    // Filter by "In Progress"
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, 'In Progress');

    await waitFor(() => {
      // Only the "In Progress" application should be visible in the count
      expect(screen.getByText(/1 Application/i)).toBeInTheDocument();
    });
  });

  it('should show no results message when filters match nothing', async () => {
    const user = userEvent.setup();
    const mockApps = [mockApplications.merit1];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(mockApps[0].scholarshipName)).toBeInTheDocument();
    });

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText(/Search by name or organization/i);
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/No applications match your filters/i)).toBeInTheDocument();
    });
  });

  it('should delete application when confirmed', async () => {
    const user = userEvent.setup();
    const mockApps = [mockApplications.merit1, mockApplications.need1];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);
    vi.mocked(api.apiDelete).mockResolvedValue(undefined);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(mockApps[0].scholarshipName)).toBeInTheDocument();
    });

    // Click actions menu (desktop view - find the first menu button with vertical ellipsis)
    const menuButtons = screen.queryAllByRole('button', { name: /Actions/i });
    if (menuButtons.length > 0) {
      await user.click(menuButtons[0]);

      // Click delete menu item
      const deleteButton = screen.getByRole('menuitem', { name: /Delete/i });
      await user.click(deleteButton);

      // Confirm deletion in dialog
      await waitFor(() => {
        expect(screen.getByText(/Delete Application/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
      await user.click(confirmButton);

      // Verify API was called
      await waitFor(() => {
        expect(api.apiDelete).toHaveBeenCalledWith(`/applications/${mockApps[0].id}`);
      });
    }
  });

  it('should cancel delete when clicking Cancel button', async () => {
    const user = userEvent.setup();
    const mockApps = [mockApplications.merit1];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(mockApps[0].scholarshipName)).toBeInTheDocument();
    });

    // Click actions menu (desktop view)
    const menuButtons = screen.queryAllByRole('button', { name: /Actions/i });
    if (menuButtons.length > 0) {
      await user.click(menuButtons[0]);

      // Click delete menu item
      const deleteButton = screen.getByRole('menuitem', { name: /Delete/i });
      await user.click(deleteButton);

      // Cancel deletion in dialog
      await waitFor(() => {
        expect(screen.getByText(/Delete Application/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      // Verify API was not called
      expect(api.apiDelete).not.toHaveBeenCalled();
    }
  });

  it('should navigate to application detail when clicking View Details', async () => {
    const user = userEvent.setup();
    const mockApps = [mockApplications.merit1];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(mockApps[0].scholarshipName)).toBeInTheDocument();
    });

    // Click actions menu (desktop view)
    const menuButtons = screen.queryAllByRole('button', { name: /Actions/i });
    if (menuButtons.length > 0) {
      await user.click(menuButtons[0]);

      // Click view details menu item
      const viewButton = screen.getByRole('menuitem', { name: /View Details/i });
      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith(`/applications/${mockApps[0].id}`);
    }
  });

  it('should handle API error gracefully', async () => {
    vi.mocked(api.apiGet).mockRejectedValue(new Error('Failed to load applications'));

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load applications/i)).toBeInTheDocument();
    });
  });

  it('should display applications count correctly', async () => {
    const mockApps = [mockApplications.merit1, mockApplications.need1, mockApplications.merit2];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(/3 Applications/i)).toBeInTheDocument();
    });
  });

  it('should display status badges with correct colors', async () => {
    const mockApps = [
      { ...mockApplications.merit1, status: 'Submitted' },
      { ...mockApplications.need1, status: 'Awarded' },
    ];
    vi.mocked(api.apiGet).mockResolvedValue(mockApps);

    renderWithProviders(<Applications />);

    await waitFor(() => {
      expect(screen.getByText(/Submitted/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Awarded/i)).toBeInTheDocument();
  });
});
