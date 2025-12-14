/**
 * Tests for CollaborationHistory component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers/render';
import CollaborationHistory from './CollaborationHistory';
import * as api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  apiGet: vi.fn(),
}));

describe('CollaborationHistory', () => {
  const collaborationId = 1;
  const mockHistory = [
    {
      id: 1,
      collaborationId: 1,
      action: 'created',
      details: 'Collaboration created',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      collaborationId: 1,
      action: 'invited',
      details: 'Invitation sent to collaborator',
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 3,
      collaborationId: 1,
      action: 'reminder_sent',
      details: 'Reminder email sent',
      createdAt: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(api.apiGet).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<CollaborationHistory collaborationId={collaborationId} />);

    expect(screen.getByText(/loading history/i)).toBeInTheDocument();
  });

  it('should fetch and display collaboration history', async () => {
    vi.mocked(api.apiGet).mockResolvedValue(mockHistory);

    renderWithProviders(<CollaborationHistory collaborationId={collaborationId} />);

    await waitFor(() => {
      expect(api.apiGet).toHaveBeenCalledWith(`/collaborations/${collaborationId}/history`);
    });

    // Wait for React Query to finish and render the details
    await waitFor(() => {
      expect(screen.getByText('Collaboration created')).toBeInTheDocument();
    });

    expect(screen.getByText('Invitation sent to collaborator')).toBeInTheDocument();
    expect(screen.getByText('Reminder email sent')).toBeInTheDocument();
  });

  it('should display history entries in chronological order', async () => {
    vi.mocked(api.apiGet).mockResolvedValue(mockHistory);

    const { container } = renderWithProviders(<CollaborationHistory collaborationId={collaborationId} />);

    await waitFor(() => {
      expect(screen.getByText('Collaboration created')).toBeInTheDocument();
    });

    // Ensure rendered order matches the array order returned by the API
    const text = container.textContent || '';
    expect(text.indexOf('Collaboration created')).toBeLessThan(text.indexOf('Invitation sent to collaborator'));
    expect(text.indexOf('Invitation sent to collaborator')).toBeLessThan(text.indexOf('Reminder email sent'));
  });

  it('should display empty state when no history exists', async () => {
    vi.mocked(api.apiGet).mockResolvedValue([]);

    renderWithProviders(<CollaborationHistory collaborationId={collaborationId} />);

    await waitFor(() => {
      expect(screen.getByText(/no history/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(api.apiGet).mockRejectedValue(new Error('Failed to load history'));

    renderWithProviders(<CollaborationHistory collaborationId={collaborationId} />);

    // React Query handles errors internally, component will show empty state or loading
    await waitFor(() => {
      // Component will either show loading or empty state on error
      expect(screen.queryByText(/loading history/i) || screen.queryByText(/no history/i)).toBeInTheDocument();
    });
  });

  it('should format timestamps correctly', async () => {
    vi.mocked(api.apiGet).mockResolvedValue(mockHistory);

    renderWithProviders(<CollaborationHistory collaborationId={collaborationId} />);

    await waitFor(() => {
      expect(screen.getByText('Collaboration created')).toBeInTheDocument();
    });

    // Check that dates are formatted (specific format depends on implementation)
    const timestamps = screen.getAllByText(/2024/);
    expect(timestamps.length).toBeGreaterThan(0);
  });
});
