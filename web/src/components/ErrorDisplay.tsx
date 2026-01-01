import React from 'react';
import {
  Box,
  Text,
  CloseButton,
} from '@chakra-ui/react';
import {
  Alert,
} from '@chakra-ui/react/alert';
import {
  type ApiError,
  ApiErrorType,
  formatRetryAfter,
} from '../utils/error-handling';

// Type for Alert status
type AlertStatus = 'info' | 'warning' | 'success' | 'error' | 'neutral';

/**
 * Props for ErrorDisplay component
 */
interface ErrorDisplayProps {
  /** The error to display */
  error: ApiError | Error | string | null | undefined;

  /** Title for the error alert (optional, will be auto-generated if not provided) */
  title?: string;

  /** Whether to show field errors (for validation errors) */
  showFieldErrors?: boolean;

  /** Whether to show the close button */
  closable?: boolean;

  /** Callback when close button is clicked */
  onClose?: () => void;

  /** Custom error message renderer */
  renderMessage?: (error: ApiError) => React.ReactNode;
}

/**
 * Get alert status (color) based on error type
 */
function getAlertStatus(error: ApiError): AlertStatus {
  switch (error.type) {
    case ApiErrorType.VALIDATION_ERROR:
    case ApiErrorType.BAD_REQUEST:
      return 'warning';

    case ApiErrorType.RATE_LIMIT_EXCEEDED:
      return 'info';

    case ApiErrorType.UNAUTHORIZED:
    case ApiErrorType.FORBIDDEN:
    case ApiErrorType.NOT_FOUND:
      return 'warning';

    case ApiErrorType.INTERNAL_SERVER_ERROR:
    case ApiErrorType.SERVICE_UNAVAILABLE:
    case ApiErrorType.NETWORK_ERROR:
    case ApiErrorType.TIMEOUT_ERROR:
      return 'error';

    default:
      return 'error';
  }
}

/**
 * Get default title based on error type
 */
function getDefaultTitle(error: ApiError): string {
  switch (error.type) {
    case ApiErrorType.VALIDATION_ERROR:
      return 'Validation Error';
    case ApiErrorType.BAD_REQUEST:
      return 'Invalid Request';
    case ApiErrorType.UNAUTHORIZED:
      return 'Unauthorized';
    case ApiErrorType.FORBIDDEN:
      return 'Access Denied';
    case ApiErrorType.NOT_FOUND:
      return 'Not Found';
    case ApiErrorType.CONFLICT:
      return 'Conflict';
    case ApiErrorType.RATE_LIMIT_EXCEEDED:
      return 'Rate Limit Exceeded';
    case ApiErrorType.INTERNAL_SERVER_ERROR:
      return 'Server Error';
    case ApiErrorType.SERVICE_UNAVAILABLE:
      return 'Service Unavailable';
    case ApiErrorType.NETWORK_ERROR:
      return 'Network Error';
    case ApiErrorType.TIMEOUT_ERROR:
      return 'Request Timeout';
    default:
      return 'Error';
  }
}

/**
 * Parse error into ApiError format
 */
function parseError(error: ApiError | Error | string | null | undefined): ApiError | null {
  if (!error) return null;

  // Already an ApiError
  if (typeof error === 'object' && 'type' in error && 'message' in error) {
    return error as ApiError;
  }

  // Error object
  if (error instanceof Error) {
    return {
      type: ApiErrorType.UNKNOWN_ERROR,
      message: error.message,
      originalError: error,
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      type: ApiErrorType.UNKNOWN_ERROR,
      message: error,
    };
  }

  return null;
}

/**
 * ErrorDisplay Component
 *
 * Displays API errors in a user-friendly format with support for:
 * - Different error types with appropriate colors and icons
 * - Rate limit information with retry-after
 * - Field-specific validation errors
 * - Closable alerts
 *
 * @example
 * // Basic usage
 * <ErrorDisplay error={error} />
 *
 * @example
 * // With custom title and close button
 * <ErrorDisplay
 *   error={error}
 *   title="Failed to save"
 *   closable
 *   onClose={() => setError(null)}
 * />
 *
 * @example
 * // Custom message renderer
 * <ErrorDisplay
 *   error={error}
 *   renderMessage={(err) => <Text>Custom: {err.message}</Text>}
 * />
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  showFieldErrors = true,
  closable = false,
  onClose,
  renderMessage,
}) => {
  const apiError = parseError(error);

  if (!apiError) return null;

  const status = getAlertStatus(apiError);
  const alertTitle = title || getDefaultTitle(apiError);

  return (
    <Alert.Root status={status}>
      <Alert.Indicator />
      <Box flex="1">
        <Alert.Title>{alertTitle}</Alert.Title>
        <Alert.Description>
          {renderMessage ? (
            renderMessage(apiError)
          ) : (
            <>
              <Text>{apiError.message}</Text>

              {/* Rate limit information */}
              {apiError.rateLimitInfo && (
                <Box mt={2}>
                  {apiError.rateLimitInfo.retryAfter && (
                    <Text fontSize="sm" color="gray.600">
                      Please try again in {formatRetryAfter(apiError.rateLimitInfo.retryAfter)}
                    </Text>
                  )}
                  {apiError.rateLimitInfo.limit && (
                    <Text fontSize="sm" color="gray.600">
                      Limit: {apiError.rateLimitInfo.remaining || 0}/{apiError.rateLimitInfo.limit} requests
                    </Text>
                  )}
                </Box>
              )}

              {/* Field errors (validation) */}
              {showFieldErrors && apiError.fieldErrors && Object.keys(apiError.fieldErrors).length > 0 && (
                <Box mt={2}>
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>
                    Please fix the following errors:
                  </Text>
                  <Box as="ul" pl={5}>
                    {Object.entries(apiError.fieldErrors).map(([field, errors]) => (
                      <Box as="li" key={field} fontSize="sm">
                        <Text as="span" fontWeight="medium">
                          {field}:
                        </Text>{' '}
                        {errors.join(', ')}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Alert.Description>
      </Box>
      {closable && onClose && (
        <CloseButton
          alignSelf="flex-start"
          position="relative"
          right={-1}
          top={-1}
          onClick={onClose}
        />
      )}
    </Alert.Root>
  );
};

/**
 * Inline Error Message Component
 * For displaying field-level validation errors
 */
interface InlineErrorProps {
  /** Error message(s) to display */
  error?: string | string[];

  /** Additional Chakra UI Box props */
  [key: string]: any;
}

export const InlineError: React.FC<InlineErrorProps> = ({ error, ...boxProps }) => {
  if (!error) return null;

  const errors = Array.isArray(error) ? error : [error];

  return (
    <Box color="red.500" fontSize="sm" mt={1} {...boxProps}>
      {errors.map((err, index) => (
        <Text key={index}>{err}</Text>
      ))}
    </Box>
  );
};

/**
 * Rate Limit Notice Component
 * Specialized component for rate limit errors
 */
interface RateLimitNoticeProps {
  /** The rate limit error */
  error: ApiError;

  /** Callback when dismissed */
  onDismiss?: () => void;
}

export const RateLimitNotice: React.FC<RateLimitNoticeProps> = ({ error, onDismiss }) => {
  if (!error.rateLimitInfo) return null;

  const retryTime = formatRetryAfter(error.rateLimitInfo.retryAfter);

  return (
    <Alert.Root status="info">
      <Alert.Indicator />
      <Box flex="1">
        <Alert.Title>Too Many Requests</Alert.Title>
        <Alert.Description>
          <Text>You've exceeded the rate limit. {retryTime && `Please wait ${retryTime} before trying again.`}</Text>
          {error.rateLimitInfo.limit && (
            <Text fontSize="sm" color="gray.600" mt={1}>
              Rate limit: {error.rateLimitInfo.limit} requests per window
            </Text>
          )}
        </Alert.Description>
      </Box>
      {onDismiss && (
        <CloseButton
          alignSelf="flex-start"
          position="relative"
          right={-1}
          top={-1}
          onClick={onDismiss}
        />
      )}
    </Alert.Root>
  );
};
