import { useToast } from '@chakra-ui/react';

// TODO: Maybe combine into a single routine and pass status in.
// I left it this way just in case we do something different for each.
/**
 * Custom hook for toast notifications with default parameters
 * 
 * @returns Object with showSuccess and showError functions
 */
export function useToastHelpers() {
  const toast = useToast();

  /**
   * Show a success toast notification
   * @param title - Toast title
   * @param description - Toast description
   * @param duration - Duration in milliseconds (default: 5000)
   * @param isClosable - Whether the toast can be closed (default: true)
   */
  const showSuccess = (
    title: string,
    description: string,
    duration: number = 5000,
    isClosable: boolean = true
  ) => {
    toast({
      title,
      description,
      status: 'success',
      duration,
      isClosable,
    });
  };

  /**
   * Show an error toast notification
   * @param title - Toast title
   * @param description - Toast description
   * @param duration - Duration in milliseconds (default: 5000)
   * @param isClosable - Whether the toast can be closed (default: true)
   */
  const showError = (
    title: string,
    description: string,
    duration: number = 5000,
    isClosable: boolean = true
  ) => {
    toast({
      title,
      description,
      status: 'error',
      duration,
      isClosable,
    });
  };

  return { showSuccess, showError };
}

