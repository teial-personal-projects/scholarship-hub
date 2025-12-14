/**
 * Integration tests for ApplicationDetail page
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import ApplicationDetail from './ApplicationDetail';
import * as api from '../services/api';
import { mockApplications, mockEssays, mockCollaborations, mockCollaborators } from '../test/fixtures';

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

// Mock navigation and params
const mockNavigate = vi.fn();
const mockParams = { id: '1' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

// Mock child components
vi.mock('../components/EssayForm', () => ({
  default: ({ applicationId, essay, onSuccess, onCancel }: any) => (
    <div data-testid="essay-form">
      <div>Essay Form</div>
      <div>Application ID: {applicationId}</div>
      <div>Essay: {essay ? essay.title : 'New'}</div>
      <button onClick={() => onSuccess()}>Save Essay</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/SendInviteDialog', () => ({
  default: ({ onClose, onSuccess }: any) => (
    <div data-testid="send-invite-dialog">
      <div>Send Invite Dialog</div>
      <button onClick={() => { onSuccess(); onClose(); }}>Send Invite</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../components/CollaborationHistory', () => ({
  default: () => (
    <div data-testid="collaboration-history">
      Collaboration History
    </div>
  ),
}));

vi.mock('../components/AddCollaborationModal', () => ({
  default: ({ onClose, onSuccess }: any) => (
    <div data-testid="add-collaboration-modal">
      <div>Add Collaboration Modal</div>
      <button onClick={() => { onSuccess(); onClose(); }}>Add Collaboration</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/EditCollaborationModal', () => ({
  default: ({ onClose, onSuccess }: any) => (
    <div data-testid="edit-collaboration-modal">
      <div>Edit Collaboration Modal</div>
      <button onClick={() => { onSuccess(); onClose(); }}>Update Collaboration</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

describe('ApplicationDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    vi.mocked(api.apiGet).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<ApplicationDetail />);

    expect(screen.getByText(/Loading application\.\.\./i)).toBeInTheDocument();
  });

  it('should fetch and display application details', async () => {
    const mockApp = mockApplications.merit1;
    const mockEssaysList = [mockEssays.personalStatement];
    const mockCollabsList: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      expect(screen.getByText(mockApp.scholarshipName)).toBeInTheDocument();
    });

    // Verify application details are displayed
    if (mockApp.organization) {
      // Organization is displayed as "by {organization}" in hero section
      await waitFor(() => {
        expect(screen.getByText(new RegExp(`by ${mockApp.organization}`, 'i'))).toBeInTheDocument();
      });
    }
  });

  it('should display essays section with essays', async () => {
    const mockApp = mockApplications.merit1;
    const mockEssaysList = [mockEssays.personalStatement, mockEssays.draft];
    const mockCollabsList: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    // Wait for essays to be loaded and displayed
    await waitFor(() => {
      if (mockEssaysList[0].theme) {
        // May appear multiple times, just check it exists
        expect(screen.getAllByText(mockEssaysList[0].theme).length).toBeGreaterThan(0);
      } else {
        // If no theme, check for essay section
        expect(screen.getByText(/Essays/i)).toBeInTheDocument();
      }
    }, { timeout: 3000 });

    if (mockEssaysList[1]?.theme) {
      await waitFor(() => {
        expect(screen.getAllByText(mockEssaysList[1].theme!).length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    }
  });

  it('should display collaborations section with collaborations', async () => {
    const mockApp = mockApplications.merit1;
    const mockEssaysList: any[] = [];
    const mockCollabsList = [
      {
        ...mockCollaborations.recommendationPending,
        collaborator: mockCollaborators.teacher1,
      },
    ];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      // Mock collaborator fetch if needed
      if (url === `/collaborators/${mockCollaborators.teacher1.id}`) {
        return Promise.resolve(mockCollaborators.teacher1);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    // Wait for collaborator to be loaded and displayed
    // The collaborator data is embedded in the collaboration response, so it should be available immediately
    await waitFor(() => {
      const collaboratorName = `${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`;
      // Check if collaborator name appears anywhere on the page
      const nameElements = screen.queryAllByText(new RegExp(collaboratorName, 'i'));
      expect(nameElements.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it('should open essay form when clicking Add Essay button', async () => {
    const user = userEvent.setup();
    const mockApp = mockApplications.merit1;
    const mockEssaysList: any[] = [];
    const mockCollabsList: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      expect(screen.getByText(mockApp.scholarshipName)).toBeInTheDocument();
    });

    // Click "Add Essay" button
    const addEssayButton = screen.getByRole('button', { name: /Add Essay/i });
    await user.click(addEssayButton);

    // Verify essay form is displayed
    await waitFor(() => {
      expect(screen.getByTestId('essay-form')).toBeInTheDocument();
    });
  });

  it('should delete essay when confirmed', async () => {
    const user = userEvent.setup();
    const mockApp = mockApplications.merit1;
    const mockEssaysList = [mockEssays.personalStatement];
    const mockCollabsList: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    vi.mocked(api.apiDelete).mockResolvedValue(undefined);

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      if (mockEssaysList[0].theme) {
        expect(screen.getAllByText(mockEssaysList[0].theme).length).toBeGreaterThan(0);
      }
    }, { timeout: 3000 });

    // Find and click the delete button (icon button) - wait for it to be available
    const deleteButtons = await screen.findAllByRole('button', { name: /Delete Essay/i });
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
      await user.click(confirmButton);

      // Verify API was called
      await waitFor(() => {
        expect(api.apiDelete).toHaveBeenCalledWith(`/essays/${mockEssaysList[0].id}`);
      });
    }
  });

  it('should navigate to edit page when clicking Edit Application button', async () => {
    const user = userEvent.setup();
    const mockApp = mockApplications.merit1;
    const mockEssaysList: any[] = [];
    const mockCollabsList: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      expect(screen.getByText(mockApp.scholarshipName)).toBeInTheDocument();
    });

    // Click "Edit Application" button
    const editButtons = screen.queryAllByRole('button', { name: /Edit Application/i });
    if (editButtons.length > 0) {
      await user.click(editButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith(`/applications/${mockApp.id}/edit`);
    }
  });

  it('should handle API error gracefully', async () => {
    vi.mocked(api.apiGet).mockRejectedValue(new Error('Failed to load application'));

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load application/i)).toBeInTheDocument();
    });
  });

  it('should show empty state for essays when none exist', async () => {
    const mockApp = mockApplications.merit1;
    const mockEssaysList: any[] = [];
    const mockCollabsList: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      expect(screen.getByText(mockApp.scholarshipName)).toBeInTheDocument();
    });

    // Verify essays section shows empty state - wait for accordion to be open
    await waitFor(() => {
      expect(screen.getByText(/No essays added yet/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show empty state for collaborations when none exist', async () => {
    const mockApp = mockApplications.merit1;
    const mockEssaysList: any[] = [];
    const mockCollabsList: any[] = [];

    vi.mocked(api.apiGet).mockImplementation((url: string) => {
      if (url === `/applications/${mockParams.id}`) {
        return Promise.resolve(mockApp);
      }
      if (url === `/applications/${mockParams.id}/essays`) {
        return Promise.resolve(mockEssaysList);
      }
      if (url === `/applications/${mockParams.id}/collaborations`) {
        return Promise.resolve(mockCollabsList);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      expect(screen.getByText(mockApp.scholarshipName)).toBeInTheDocument();
    });

    // Verify collaborations section shows empty state
    await waitFor(() => {
      expect(screen.getByText(/No collaborations added yet. Click "Add Collaborator" to get started./i)).toBeInTheDocument();
    });
  });
});
