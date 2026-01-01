import React from 'react';
import { Box } from '@chakra-ui/react';
import { sanitizeHtml, SanitizeOptions } from '../utils/sanitize-html';

/**
 * SafeHtml Component
 *
 * Renders sanitized HTML content safely using DOMPurify.
 * Prevents XSS attacks by removing dangerous HTML/JavaScript before rendering.
 *
 * @example
 * // Basic usage
 * <SafeHtml content={userGeneratedHtml} />
 *
 * @example
 * // With custom profile
 * <SafeHtml content={notes} profile="STRICT" />
 *
 * @example
 * // With Chakra UI styling
 * <SafeHtml content={essay} profile="BASIC" p={4} bg="gray.50" />
 */

interface SafeHtmlProps {
  /**
   * HTML content to sanitize and render
   */
  content: string | null | undefined;

  /** Chakra UI Box props */
  [key: string]: any;

  /**
   * Sanitization options (profile, maxLength, etc.)
   */
  sanitizeOptions?: SanitizeOptions;

  /**
   * Shorthand for setting sanitization profile
   */
  profile?: SanitizeOptions['profile'];

  /**
   * Maximum length of content (characters)
   */
  maxLength?: number;

  /**
   * Fallback content when HTML is empty/null
   */
  fallback?: React.ReactNode;

  /**
   * Show warning when content was sanitized/modified
   */
  showSanitizationWarning?: boolean;

  /**
   * Custom warning component to show when content was modified
   */
  warningComponent?: React.ReactNode;
}

/**
 * SafeHtml Component - Renders sanitized HTML safely
 */
export const SafeHtml: React.FC<SafeHtmlProps> = ({
  content,
  sanitizeOptions,
  profile = 'BASIC',
  maxLength,
  fallback = null,
  showSanitizationWarning = false,
  warningComponent,
  ...boxProps
}) => {
  // Merge sanitization options
  const options: SanitizeOptions = {
    profile,
    maxLength,
    ...sanitizeOptions,
  };

  // Sanitize the content
  const sanitized = sanitizeHtml(content, options);

  // Check if content was modified during sanitization
  const wasModified = showSanitizationWarning && content && content.trim() !== sanitized?.trim();

  // Return fallback if no content
  if (!sanitized) {
    return <>{fallback}</>;
  }

  return (
    <>
      {wasModified && (
        warningComponent || (
          <Box
            bg="yellow.50"
            color="yellow.800"
            p={2}
            mb={2}
            borderRadius="md"
            fontSize="sm"
            borderLeft="4px solid"
            borderColor="yellow.400"
          >
            ⚠️ Some content was removed for security reasons
          </Box>
        )
      )}
      <Box
        {...boxProps}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </>
  );
};

/**
 * SafeNote Component - Renders notes with STRICT sanitization
 */
export const SafeNote: React.FC<SafeHtmlProps> = (props) => (
  <SafeHtml {...props} profile="STRICT" />
);

/**
 * SafeEssay Component - Renders essays with BASIC sanitization
 */
export const SafeEssay: React.FC<SafeHtmlProps> = (props) => (
  <SafeHtml {...props} profile="BASIC" />
);

/**
 * SafeDocumentation Component - Renders documentation with EXTENDED sanitization
 */
export const SafeDocumentation: React.FC<SafeHtmlProps> = (props) => (
  <SafeHtml {...props} profile="EXTENDED" />
);
