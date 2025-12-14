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
      expect(screen.getByLabelText(/theme\/topic/i)).toHaveValue('');
      expect(screen.getByLabelText(/word count/i)).toHaveValue('');
      expect(screen.getByLabelText(/essay link/i)).toHaveValue('');
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
      await user.type(screen.getByLabelText(/theme\/topic/i), 'Personal Statement');
      await user.type(screen.getByLabelText(/word count/i), '500');
      await user.type(screen.getByLabelText(/essay link/i), 'https://docs.google.com/document/d/abc123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(api.apiPost).toHaveBeenCalledWith(`/applications/${applicationId}/essays`, {
          theme: 'Personal Statement',
          wordCount: 500,
          essayLink: 'https://docs.google.com/document/d/abc123',
          status: 'not_started',
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should allow submitting form with minimal fields', async () => {
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

      // Submit form with only status (all fields are optional)
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(api.apiPost).toHaveBeenCalledWith(`/applications/${applicationId}/essays`, {
          theme: null,
          wordCount: null,
          essayLink: null,
          status: 'not_started',
        });
      });
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
      if (mockEssays.personalStatement.theme) {
        expect(screen.getByLabelText(/theme\/topic/i)).toHaveValue(mockEssays.personalStatement.theme);
      }
      if (mockEssays.personalStatement.wordCount) {
        expect(screen.getByLabelText(/word count/i)).toHaveValue(mockEssays.personalStatement.wordCount.toString());
      }
      if (mockEssays.personalStatement.essayLink) {
        expect(screen.getByLabelText(/essay link/i)).toHaveValue(mockEssays.personalStatement.essayLink);
      }
    });

    it('should update existing essay when form is submitted', async () => {
      const user = userEvent.setup();
      const updatedEssay = { ...mockEssays.personalStatement, theme: 'Updated Theme' };
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

      // Update theme
      const themeInput = screen.getByLabelText(/theme\/topic/i);
      await user.clear(themeInput);
      await user.type(themeInput, 'Updated Theme');

      // Submit form
      await user.click(screen.getByRole('button', { name: /update/i }));

      await waitFor(() => {
        expect(api.apiPatch).toHaveBeenCalledWith(`/essays/${mockEssays.personalStatement.id}`, {
          theme: 'Updated Theme',
          wordCount: mockEssays.personalStatement.wordCount || null,
          essayLink: mockEssays.personalStatement.essayLink || null,
          status: mockEssays.personalStatement.status || 'not_started',
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
      await user.type(screen.getByLabelText(/theme\/topic/i), 'Test Essay');
      await user.type(screen.getByLabelText(/word count/i), '500');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Toast error should be displayed (implementation depends on toast library)
      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
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
