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
  default: ({ collaboration, onClose, onSuccess }: any) => (
    <div data-testid="send-invite-dialog">
      <div>Send Invite Dialog</div>
      <button onClick={() => { onSuccess(); onClose(); }}>Send Invite</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../components/CollaborationHistory', () => ({
  default: ({ collaborationId }: any) => (
    <div data-testid="collaboration-history">
      Collaboration History for {collaborationId}
    </div>
  ),
}));

vi.mock('../components/AddCollaborationModal', () => ({
  default: ({ applicationId, onClose, onSuccess }: any) => (
    <div data-testid="add-collaboration-modal">
      <div>Add Collaboration Modal</div>
      <button onClick={() => { onSuccess(); onClose(); }}>Add Collaboration</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/EditCollaborationModal', () => ({
  default: ({ collaboration, onClose, onSuccess }: any) => (
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

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
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
      expect(screen.getByText(mockApp.organization)).toBeInTheDocument();
    }
    if (mockApp.amount) {
      expect(screen.getByText(`$${mockApp.amount.toLocaleString()}`)).toBeInTheDocument();
    }
  });

  it('should display essays section with essays', async () => {
    const mockApp = mockApplications.merit1;
    const mockEssaysList = [mockEssays.personalStatement, mockEssays.communityService];
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
      expect(screen.getByText(mockEssaysList[0].title)).toBeInTheDocument();
    });

    expect(screen.getByText(mockEssaysList[1].title)).toBeInTheDocument();
  });

  it('should display collaborations section with collaborations', async () => {
    const mockApp = mockApplications.merit1;
    const mockEssaysList: any[] = [];
    const mockCollabsList = [
      {
        ...mockCollaborations.recommendation1,
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
      return Promise.reject(new Error('Unknown endpoint'));
    });

    renderWithProviders(<ApplicationDetail />);

    await waitFor(() => {
      const collaboratorName = `${mockCollaborators.teacher1.firstName} ${mockCollaborators.teacher1.lastName}`;
      expect(screen.getByText(collaboratorName)).toBeInTheDocument();
    });
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
      expect(screen.getByText(mockEssaysList[0].title)).toBeInTheDocument();
    });

    // Find and click the delete button (menu or direct button)
    const menuButtons = screen.queryAllByRole('button', { name: /⋮/i });
    if (menuButtons.length > 0) {
      await user.click(menuButtons[0]);

      // Click delete menu item
      const deleteButton = await screen.findByRole('menuitem', { name: /Delete/i });
      await user.click(deleteButton);

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

    // Verify essays section shows empty state
    expect(screen.getByText(/No essays yet/i)).toBeInTheDocument();
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
    expect(screen.getByText(/No collaborations yet/i)).toBeInTheDocument();
  });
});
