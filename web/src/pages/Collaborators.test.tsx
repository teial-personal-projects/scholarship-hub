/**
 * Integration tests for Collaborators page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import Collaborators from './Collaborators';
import * as api from '../services/api';
import { mockCollaborators } from '../test/fixtures';

// Mock the API
vi.mock('../services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

// Mock toast utilities
vi.mock('../utils/toast', () => ({
  useToastHelpers: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

// Mock CollaboratorForm component
vi.mock('../components/CollaboratorForm', () => ({
  default: ({ collaborator, onSuccess, onCancel }: any) => (
    <div data-testid="collaborator-form">
      <div>Collaborator Form</div>
      <div>Collaborator: {collaborator ? `${collaborator.firstName} ${collaborator.lastName}` : 'New'}</div>
      <button onClick={() => onSuccess()}>Save Collaborator</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock useCollaborators hook
const mockFetchCollaborators = vi.fn();
const mockCollaboratorsList = [
  { ...mockCollaborators.teacher1, relationship: 'Teacher' },
  { ...mockCollaborators.counselor1, relationship: 'Counselor' },
  { ...mockCollaborators.mentor1, relationship: 'Mentor' },
];

vi.mock('../hooks/useCollaborators', () => {
  return {
    useCollaborators: vi.fn(() => ({
      collaborators: mockCollaboratorsList,
      loading: false,
      fetchCollaborators: mockFetchCollaborators,
    })),
  };
});

describe('Collaborators Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCollaborators.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch collaborators on mount', () => {
    renderWithProviders(<Collaborators />);

    expect(mockFetchCollaborators).toHaveBeenCalled();
  });

  it('should render page header with Add Collaborator button', () => {
    renderWithProviders(<Collaborators />);

    expect(screen.getByRole('heading', { name: /Collaborators/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Collaborator/i })).toBeInTheDocument();
  });

  it.skip('should display collaborators organized by tabs', async () => {
    renderWithProviders(<Collaborators />);

    // Wait for page to render - check for heading first
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Collaborators/i })).toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait for table headers or collaborator data
    await waitFor(() => {
      const nameHeader = screen.queryByText(/Name/i);
      const collaboratorName = screen.queryByText(new RegExp(`${mockCollaborators.teacher1.firstName}`, 'i'));
      expect(nameHeader || collaboratorName).toBeTruthy();
    }, { timeout: 3000 });
  });

  it.skip('should display collaborator details in table', async () => {
    renderWithProviders(<Collaborators />);

    // Wait for collaborators to be rendered
    await waitFor(() => {
      // Check if collaborator names are displayed (full name: firstName lastName)
      const fullName = `${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`;
      const nameElement = screen.queryByText(fullName);
      expect(nameElement).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify email is also displayed
    await waitFor(() => {
      expect(screen.getByText(mockCollaborators.teacher1.emailAddress)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should open form when clicking Add Collaborator button', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Collaborators />);

    const addButton = screen.getByRole('button', { name: /Add Collaborator/i });
    await user.click(addButton);

    // Verify form is displayed
    await waitFor(() => {
      expect(screen.getByTestId('collaborator-form')).toBeInTheDocument();
    });

    expect(screen.getByText(/Collaborator: New/i)).toBeInTheDocument();
  });

  it.skip('should open form in edit mode when clicking Edit', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Collaborators />);

    // Wait for collaborator to be displayed
    await waitFor(() => {
      const fullName = `${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`;
      expect(screen.getByText(fullName)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find and click edit button (menu button)
    const menuButtons = await screen.findAllByRole('button', { name: /Collaborator actions/i }, { timeout: 3000 });
    expect(menuButtons.length).toBeGreaterThan(0);
    
    await user.click(menuButtons[0]);

    // Click edit menu item
    const editButton = await screen.findByRole('menuitem', { name: /Edit/i }, { timeout: 2000 });
    await user.click(editButton);

    // Verify form is displayed in edit mode
    await waitFor(() => {
      expect(screen.getByTestId('collaborator-form')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText(new RegExp(`${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`, 'i'))).toBeInTheDocument();
  });

  it.skip('should delete collaborator when confirmed', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiDelete).mockResolvedValue(undefined);

    renderWithProviders(<Collaborators />);

    await waitFor(() => {
      const fullName = `${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`;
      expect(screen.getByText(fullName)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find and click delete button
    const menuButtons = await screen.findAllByRole('button', { name: /Collaborator actions/i }, { timeout: 3000 });
    expect(menuButtons.length).toBeGreaterThan(0);
    
    await user.click(menuButtons[0]);

    // Click delete menu item
    const deleteButton = await screen.findByRole('menuitem', { name: /Delete/i }, { timeout: 2000 });
    await user.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
    await user.click(confirmButton);

    // Verify API was called
    await waitFor(() => {
      expect(api.apiDelete).toHaveBeenCalledWith(`/collaborators/${mockCollaborators.teacher1.id}`);
    }, { timeout: 2000 });

    // Verify fetchCollaborators was called to refresh the list
    expect(mockFetchCollaborators).toHaveBeenCalled();
  });

  it.skip('should cancel delete when clicking Cancel button', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Collaborators />);

    await waitFor(() => {
      const fullName = `${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`;
      expect(screen.getByText(fullName)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find and click delete button
    const menuButtons = await screen.findAllByRole('button', { name: /Collaborator actions/i }, { timeout: 3000 });
    expect(menuButtons.length).toBeGreaterThan(0);
    
    await user.click(menuButtons[0]);

    // Click delete menu item
    const deleteButton = await screen.findByRole('menuitem', { name: /Delete/i }, { timeout: 2000 });
    await user.click(deleteButton);

    // Cancel deletion
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Verify API was not called
    expect(api.apiDelete).not.toHaveBeenCalled();
  });

  it('should refresh collaborators list after successful form submission', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Collaborators />);

    const addButton = screen.getByRole('button', { name: /Add Collaborator/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('collaborator-form')).toBeInTheDocument();
    });

    // Submit the form
    const saveButton = screen.getByRole('button', { name: /Save Collaborator/i });
    await user.click(saveButton);

    // Verify fetchCollaborators was called to refresh the list
    await waitFor(() => {
      expect(mockFetchCollaborators).toHaveBeenCalled();
    });
  });

  it.skip('should close form when clicking Cancel', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Collaborators />);

    const addButton = await screen.findByRole('button', { name: /Add Collaborator/i }, { timeout: 2000 });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('collaborator-form')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Verify form is closed
    await waitFor(() => {
      expect(screen.queryByTestId('collaborator-form')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it.skip('should display phone numbers when available', async () => {
    renderWithProviders(<Collaborators />);

    // Wait for collaborator to be displayed
    await waitFor(() => {
      const fullName = `${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`;
      expect(screen.getByText(fullName)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check if phone number is displayed
    await waitFor(() => {
      // teacher1 has phoneNumber: '+1234567890'
      if (mockCollaborators.teacher1.phoneNumber) {
        expect(screen.getByText(mockCollaborators.teacher1.phoneNumber)).toBeInTheDocument();
      } else {
        // If no phone number, check that '-' is displayed
        expect(screen.getByText(/-/i)).toBeInTheDocument();
      }
    }, { timeout: 2000 });
  });

  it('should handle empty collaborator list', () => {
    // Mock empty list
    vi.mock('../hooks/useCollaborators', () => ({
      useCollaborators: () => ({
        collaborators: [],
        loading: false,
        fetchCollaborators: mockFetchCollaborators,
      }),
    }));

    renderWithProviders(<Collaborators />);

    // The page should still render without errors
    expect(screen.getByRole('heading', { name: /Collaborators/i })).toBeInTheDocument();
  });
});
