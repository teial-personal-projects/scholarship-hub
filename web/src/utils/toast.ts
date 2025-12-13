import { useCallback } from 'react';
import { toaster } from '../components/ui/toaster';

// TODO: Maybe combine into a single routine and pass status in.
// I left it this way just in case we do something different for each.
/**
 * Custom hook for toast notifications with default parameters
 * 
 * @returns Object with showSuccess and showError functions
 */
export function useToastHelpers() {
  /**
   * Show a success toast notification
   * @param title - Toast title
   * @param description - Toast description
   * @param duration - Duration in milliseconds (default: 5000)
   * @param isClosable - Whether the toast can be closed (default: true)
   */
  const showSuccess = useCallback((
    title: string,
    description: string,
    duration: number = 5000,
    isClosable: boolean = true
  ) => {
    toaster.create({
      title,
      description,
      duration,
      type: 'success',
      closable: isClosable,
    });
  }, []);

  /**
   * Show an error toast notification
   * @param title - Toast title
   * @param description - Toast description
   * @param duration - Duration in milliseconds (default: 5000)
   * @param isClosable - Whether the toast can be closed (default: true)
   */
  const showError = useCallback((
    title: string,
    description: string,
    duration: number = 5000,
    isClosable: boolean = true
  ) => {
    toaster.create({
      title,
      description,
      duration,
      type: 'error',
      closable: isClosable,
    });
  }, []);

  return { showSuccess, showError };
}

