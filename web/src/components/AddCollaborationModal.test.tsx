/**
 * Tests for AddCollaborationModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import AddCollaborationModal from './AddCollaborationModal';
import { mockCollaborators, mockEssays } from '../test/fixtures';
import * as api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe('AddCollaborationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const applicationId = 1;
  const essays = [mockEssays.personalStatement, mockEssays.draft];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with collaborator selection', async () => {
    vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher, mockCollaborators.counselor]);

    renderWithProviders(
      <AddCollaborationModal
        isOpen={true}
        onClose={mockOnClose}
        applicationId={applicationId}
        essays={essays}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /^collaborator$/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/collaboration type/i)).toBeInTheDocument();
  });

  it('should load collaborators from API', async () => {
    vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);

    renderWithProviders(
      <AddCollaborationModal
        isOpen={true}
        onClose={mockOnClose}
        applicationId={applicationId}
        essays={essays}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(api.apiGet).toHaveBeenCalledWith('/collaborators');
    });
  });

  it('should display message when no collaborators exist', async () => {
    vi.mocked(api.apiGet).mockResolvedValue([]);

    renderWithProviders(
      <AddCollaborationModal
        isOpen={true}
        onClose={mockOnClose}
        applicationId={applicationId}
        essays={essays}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/don't have any saved collaborators/i)).toBeInTheDocument();
    });
  });

  describe('Recommendation Collaboration', () => {
    it('should create recommendation collaboration', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);
      vi.mocked(api.apiPost).mockResolvedValue({ success: true });

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={essays}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /^collaborator$/i })).toBeInTheDocument();
      });

      // Select collaborator
      await user.selectOptions(screen.getByRole('combobox', { name: /^collaborator$/i }), '1');

      // Recommendation requires due date
      await user.type(screen.getByLabelText(/^due date/i), '2024-12-15');

      // Select type (recommendation is default)
      const typeSelect = screen.getByLabelText(/collaboration type/i);
      expect(typeSelect).toHaveValue('recommendation');

      // Submit
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      await waitFor(() => {
        expect(api.apiPost).toHaveBeenCalledWith('/collaborations', expect.objectContaining({
          collaboratorId: 1,
          applicationId: 1,
          collaborationType: 'recommendation',
        }));
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show portal URL field for recommendations', async () => {
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={essays}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/recommendation portal url/i)).toBeInTheDocument();
      });
    });
  });

  describe('Essay Review Collaboration', () => {
    it('should create essay review collaboration', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);
      vi.mocked(api.apiPost).mockResolvedValue({ success: true });

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={essays}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /^collaborator$/i })).toBeInTheDocument();
      });

      // Select collaborator
      await user.selectOptions(screen.getByRole('combobox', { name: /^collaborator$/i }), '1');

      // Select essay review type
      await user.selectOptions(screen.getByLabelText(/collaboration type/i), 'essayReview');

      // Submit
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      await waitFor(() => {
        expect(api.apiPost).toHaveBeenCalledWith('/collaborations', expect.objectContaining({
          collaboratorId: 1,
          applicationId: 1,
          collaborationType: 'essayReview',
        }));
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should not show warning when no essays exist for essay review', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={[]}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /^collaborator$/i })).toBeInTheDocument();
      });

      // Select essay review type
      await user.selectOptions(screen.getByLabelText(/collaboration type/i), 'essayReview');

      // No essay selection UI/warning should appear anymore
      expect(screen.queryByText(/no essays available/i)).not.toBeInTheDocument();
    });
  });

  describe('Guidance Collaboration', () => {
    it('should create guidance collaboration with session details', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.counselor]);
      vi.mocked(api.apiPost).mockResolvedValue({ success: true });

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={essays}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /^collaborator$/i })).toBeInTheDocument();
      });

      // Select collaborator
      await user.selectOptions(screen.getByRole('combobox', { name: /^collaborator$/i }), '2');

      // Select guidance type
      await user.selectOptions(screen.getByLabelText(/collaboration type/i), 'guidance');

      // Session type field should appear
      await waitFor(() => {
        expect(screen.getByLabelText(/session type/i)).toBeInTheDocument();
      });

      // Select session type
      await user.selectOptions(screen.getByLabelText(/session type/i), 'one-on-one');

      // Submit
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      await waitFor(() => {
        expect(api.apiPost).toHaveBeenCalledWith('/collaborations', expect.objectContaining({
          collaboratorId: 2,
          applicationId: 1,
          collaborationType: 'guidance',
          sessionType: 'one-on-one',
        }));
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should disable submit button when no collaborator selected', async () => {
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={essays}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /^collaborator$/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /^add$/i });
      expect(submitButton).toBeDisabled();
    });

    it('should not disable submit button when essay review selected', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={essays}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /^collaborator$/i })).toBeInTheDocument();
      });

      // Select collaborator
      await user.selectOptions(screen.getByRole('combobox', { name: /^collaborator$/i }), '1');

      // Select essay review type
      await user.selectOptions(screen.getByLabelText(/collaboration type/i), 'essayReview');

      const submitButton = screen.getByRole('button', { name: /^add$/i });
      expect(submitButton).toBeEnabled();
    });
  });

  describe('User Interactions', () => {
    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiGet).mockResolvedValue([mockCollaborators.teacher]);

      renderWithProviders(
        <AddCollaborationModal
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essays={essays}
          onSuccess={mockOnSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
      expect(api.apiPost).not.toHaveBeenCalled();
    });
  });
});
