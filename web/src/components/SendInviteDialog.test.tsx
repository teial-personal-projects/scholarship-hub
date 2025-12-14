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

    expect(screen.getByText(/send collaboration invitation/i)).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(collaboratorName, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(applicationName, 'i')).length).toBeGreaterThan(0);
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

    await user.click(screen.getByRole('button', { name: /send now/i }));

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith(
        `/collaborations/${mockCollaboration.id}/invite`,
        {}
      );
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display existing notes when present', async () => {
    const collaborationWithNotes = { ...mockCollaboration, notes: 'Please submit by end of month' };

    renderWithProviders(
      <SendInviteDialog
        isOpen={true}
        onClose={mockOnClose}
        collaboration={collaborationWithNotes}
        collaboratorName={collaboratorName}
        applicationName={applicationName}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Please submit by end of month')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /send now/i }));

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
