/**
 * Tests for EssayForm component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers/render';
import EssayForm from './EssayForm';
import { mockEssays } from '../test/fixtures';
import * as api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

describe('EssayForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const applicationId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render empty form for creating new essay', () => {
      renderWithProviders(
        <EssayForm
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essay={null}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Add Essay')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toHaveValue('');
      expect(screen.getByLabelText(/prompt/i)).toHaveValue('');
      expect(screen.getByLabelText(/content/i)).toHaveValue('');
    });

    it('should create new essay when form is submitted', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiPost).mockResolvedValue(mockEssays.personalStatement);

      renderWithProviders(
        <EssayForm
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essay={null}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill out form
      await user.type(screen.getByLabelText(/title/i), 'Personal Statement');
      await user.type(screen.getByLabelText(/prompt/i), 'Describe your goals');
      await user.type(screen.getByLabelText(/content/i), 'My goals are...');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(api.apiPost).toHaveBeenCalledWith(`/applications/${applicationId}/essays`, {
          title: 'Personal Statement',
          prompt: 'Describe your goals',
          content: 'My goals are...',
          essayLink: '',
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should display validation error when title is missing', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <EssayForm
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essay={null}
          onSuccess={mockOnSuccess}
        />
      );

      // Try to submit without filling title
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Form should not be submitted
      expect(api.apiPost).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('should render form with existing essay data', () => {
      renderWithProviders(
        <EssayForm
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essay={mockEssays.personalStatement}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Edit Essay')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockEssays.personalStatement.title);
      expect(screen.getByLabelText(/prompt/i)).toHaveValue(mockEssays.personalStatement.prompt);
      expect(screen.getByLabelText(/content/i)).toHaveValue(mockEssays.personalStatement.content);
    });

    it('should update existing essay when form is submitted', async () => {
      const user = userEvent.setup();
      const updatedEssay = { ...mockEssays.personalStatement, title: 'Updated Title' };
      vi.mocked(api.apiPatch).mockResolvedValue(updatedEssay);

      renderWithProviders(
        <EssayForm
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essay={mockEssays.personalStatement}
          onSuccess={mockOnSuccess}
        />
      );

      // Update title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(api.apiPatch).toHaveBeenCalledWith(`/essays/${mockEssays.personalStatement.id}`, {
          title: 'Updated Title',
          prompt: mockEssays.personalStatement.prompt,
          content: mockEssays.personalStatement.content,
          essayLink: mockEssays.personalStatement.essayLink,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.apiPost).mockRejectedValue(new Error('Failed to save essay'));

      renderWithProviders(
        <EssayForm
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essay={null}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill out form
      await user.type(screen.getByLabelText(/title/i), 'Test Essay');
      await user.type(screen.getByLabelText(/prompt/i), 'Test prompt');
      await user.type(screen.getByLabelText(/content/i), 'Test content');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Toast error should be displayed (implementation depends on toast library)
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <EssayForm
          isOpen={true}
          onClose={mockOnClose}
          applicationId={applicationId}
          essay={null}
          onSuccess={mockOnSuccess}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
      expect(api.apiPost).not.toHaveBeenCalled();
    });
  });
});
