import { useState, useCallback } from 'react';
import { apiGet } from '../services/api';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

/**
 * Custom hook for fetching and managing collaborations for the current collaborator
 * Fetches from /collaborators/me/collaborations endpoint
 * @returns Object with collaborations list, loading state, and fetch function
 */
export function useCollaborations() {
  const { showError } = useToastHelpers();
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      // Endpoint: GET /api/collaborators/me/collaborations
      const data = await apiGet<CollaborationResponse[]>('/collaborators/me/collaborations');
      setCollaborations(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load collaborations';
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]); // showError is now memoized and stable, but keeping it for clarity

  return {
    collaborations,
    loading,
    fetchCollaborations,
    setCollaborations, // In case you need to update the list directly
  };
}

