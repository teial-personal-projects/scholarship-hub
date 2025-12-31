/**
 * API client utility for making authenticated requests to the backend
 */

const API_BASE_URL = '/api';

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Get the access token from the session
 */
async function getAccessToken(): Promise<string | null> {
  // Try to get session from Supabase
  const { supabase } = await import('../config/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Refresh the access token
 * Returns the new access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { supabase } = await import('../config/supabase');
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error('Token refresh failed:', error);
        // Sign out and redirect to login
        await supabase.auth.signOut();
        window.location.href = '/login';
        return null;
      }

      return data.session.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Sign out and redirect to login on error
      const { supabase } = await import('../config/supabase');
      await supabase.auth.signOut();
      window.location.href = '/login';
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No authentication token available');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - attempt token refresh and retry
  if (response.status === 401) {
    console.log('Received 401, attempting to refresh token...');

    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry the request with the new token
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };

      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });

      // If retry succeeds, return the response
      if (retryResponse.ok) {
        const contentType = retryResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return retryResponse.json();
        }
        return {} as T;
      }

      // If retry also fails, fall through to error handling below
      const error = await retryResponse.json().catch(() => ({
        error: 'Unknown error',
        message: retryResponse.statusText,
      }));

      let errorMessage = error.message || `API request failed after token refresh: ${retryResponse.statusText}`;
      if (error.error && error.error !== 'Error') {
        errorMessage = `${error.error}: ${errorMessage}`;
      }

      const apiError = new Error(errorMessage);
      (apiError as any).errorDetails = error;
      throw apiError;
    }

    // If refresh failed, user has already been redirected to login
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Unknown error',
      message: response.statusText,
    }));

    // Create a more descriptive error message
    let errorMessage = error.message || `API request failed: ${response.statusText}`;

    // Include error type if available
    if (error.error && error.error !== 'Error') {
      errorMessage = `${error.error}: ${errorMessage}`;
    }

    // Include original error details in development
    if (process.env.NODE_ENV === 'development' && error.originalError) {
      errorMessage += `\n\nOriginal error: ${JSON.stringify(error.originalError, null, 2)}`;
    }

    const apiError = new Error(errorMessage);
    // Attach the full error object for debugging
    (apiError as any).errorDetails = error;
    throw apiError;
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return {} as T;
}

/**
 * GET request
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'GET',
  });
}

/**
 * POST request
 */
export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
export async function apiPatch<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
  });
}

