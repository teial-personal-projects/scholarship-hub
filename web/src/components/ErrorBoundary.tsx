import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { Box, Heading, Text, Button, VStack, Code, Container } from '@chakra-ui/react';

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;

  /** Custom fallback UI */
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;

  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /** Whether to show error details in UI (default: only in development) */
  showDetails?: boolean;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;

  /** The caught error */
  error: Error | null;

  /** React error info */
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * React error boundary that catches JavaScript errors anywhere in the child
 * component tree and displays a fallback UI instead of crashing the whole app.
 *
 * Features:
 * - Catches errors in child components
 * - Displays user-friendly error message
 * - Shows error details in development
 * - Provides reset functionality
 * - Logs errors for debugging
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={(error, errorInfo, reset) => (
 *     <div>
 *       <h1>Oops!</h1>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 * >
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * // With error logging
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     logErrorToService(error, errorInfo);
 *   }}
 * >
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Handle the error (logging, reporting, etc.)
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset the error boundary
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Render fallback UI when error is caught
   */
  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback && errorInfo) {
        return fallback(error, errorInfo, this.resetErrorBoundary);
      }

      // Default fallback UI
      const isDevelopment = import.meta.env.DEV;
      const shouldShowDetails = showDetails !== undefined ? showDetails : isDevelopment;

      return (
        <Container maxW="container.md" py={10}>
          <VStack gap={6} align="stretch">
            <Box textAlign="center">
              <Heading as="h1" size="xl" color="red.500" mb={2}>
                Something went wrong
              </Heading>
              <Text color="gray.600" fontSize="lg">
                We're sorry, but something unexpected happened.
              </Text>
            </Box>

            <Box>
              <Button
                colorScheme="blue"
                onClick={this.resetErrorBoundary}
                width="full"
                size="lg"
              >
                Try Again
              </Button>
            </Box>

            {shouldShowDetails && (
              <Box
                bg="red.50"
                borderRadius="md"
                p={4}
                borderLeft="4px solid"
                borderColor="red.500"
              >
                <Heading as="h3" size="sm" color="red.700" mb={2}>
                  Error Details (Development Only)
                </Heading>

                <Box mb={4}>
                  <Text fontWeight="semibold" fontSize="sm" mb={1}>
                    Error Message:
                  </Text>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    p={2}
                    borderRadius="md"
                    bg="white"
                  >
                    {error.message}
                  </Code>
                </Box>

                {error.stack && (
                  <Box mb={4}>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Stack Trace:
                    </Text>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      p={2}
                      borderRadius="md"
                      bg="white"
                      fontSize="xs"
                      maxH="200px"
                      overflowY="auto"
                    >
                      {error.stack}
                    </Code>
                  </Box>
                )}

                {errorInfo?.componentStack && (
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Component Stack:
                    </Text>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      p={2}
                      borderRadius="md"
                      bg="white"
                      fontSize="xs"
                      maxH="200px"
                      overflowY="auto"
                    >
                      {errorInfo.componentStack}
                    </Code>
                  </Box>
                )}

                <Box mt={4}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Reload Page
                  </Button>
                </Box>
              </Box>
            )}

            {!shouldShowDetails && (
              <Box textAlign="center">
                <Text fontSize="sm" color="gray.500">
                  If this problem persists, please contact support.
                </Text>
              </Box>
            )}
          </VStack>
        </Container>
      );
    }

    return children;
  }
}

/**
 * Hook for using ErrorBoundary programmatically
 * Allows throwing errors from event handlers or async code
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}
