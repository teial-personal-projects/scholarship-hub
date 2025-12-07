/**
 * Tests for SendInviteDialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import SendInviteDialog from './SendInviteDialog';
import { mockCollaborations } from '../test/fixtures';
import * as api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  apiPost: vi.fn(),
}));

describe('SendInviteDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockCollaboration = mockCollaborations.recommendationPending;
  const collaboratorName = 'Dr. Sarah Johnson';
  const applicationName = 'Merit Scholarship';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with collaboration details', () => {
    renderWithProviders(
      <SendInviteDialog
        isOpen={true}
        onClose={mockOnClose}
        collaboration={mockCollaboration}
        collaboratorName={collaboratorName}
        applicationName={applicationName}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/send invitation/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(collaboratorName, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(applicationName, 'i'))).toBeInTheDocument();
  });

  it('should send invitation when send button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockResolvedValue({ success: true });

    renderWithProviders(
      <SendInviteDialog
        isOpen={true}
        onClose={mockOnClose}
        collaboration={mockCollaboration}
        collaboratorName={collaboratorName}
        applicationName={applicationName}
        onSuccess={mockOnSuccess}
      />
    );

    await user.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith(
        `/collaborations/${mockCollaboration.id}/invite`,
        expect.any(Object)
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should allow user to add optional notes', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockResolvedValue({ success: true });

    renderWithProviders(
      <SendInviteDialog
        isOpen={true}
        onClose={mockOnClose}
        collaboration={mockCollaboration}
        collaboratorName={collaboratorName}
        applicationName={applicationName}
        onSuccess={mockOnSuccess}
      />
    );

    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'Please submit by end of month');

    await user.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith(
        `/collaborations/${mockCollaboration.id}/invite`,
        expect.objectContaining({
          notes: 'Please submit by end of month',
        })
      );
    });
  });

  it('should close dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SendInviteDialog
        isOpen={true}
        onClose={mockOnClose}
        collaboration={mockCollaboration}
        collaboratorName={collaboratorName}
        applicationName={applicationName}
        onSuccess={mockOnSuccess}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
    expect(api.apiPost).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    vi.mocked(api.apiPost).mockRejectedValue(new Error('Failed to send invitation'));

    renderWithProviders(
      <SendInviteDialog
        isOpen={true}
        onClose={mockOnClose}
        collaboration={mockCollaboration}
        collaboratorName={collaboratorName}
        applicationName={applicationName}
        onSuccess={mockOnSuccess}
      />
    );

    await user.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalled();
    });

    // Toast error should be displayed
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <SendInviteDialog
        isOpen={false}
        onClose={mockOnClose}
        collaboration={mockCollaboration}
        collaboratorName={collaboratorName}
        applicationName={applicationName}
        onSuccess={mockOnSuccess}
      />
    );

    // Modal should not be visible
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
