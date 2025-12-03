import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  Stack,
  FormHelperText,
} from '@chakra-ui/react';
import { apiPost, apiPatch } from '../services/api';
import type { EssayResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface EssayFormProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  essay?: EssayResponse | null;
  onSuccess: () => void;
}

function EssayForm({ isOpen, onClose, applicationId, essay, onSuccess }: EssayFormProps) {
  const { showSuccess, showError } = useToastHelpers();
  const isEditMode = !!essay;

  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState('');
  const [wordCount, setWordCount] = useState<number | undefined>();
  const [essayLink, setEssayLink] = useState('');

  useEffect(() => {
    if (essay) {
      setTheme(essay.theme || '');
      setWordCount(essay.wordCount || undefined);
      setEssayLink(essay.essayLink || '');
    } else {
      // Reset form when opening for new essay
      setTheme('');
      setWordCount(undefined);
      setEssayLink('');
    }
  }, [essay, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const payload = {
        theme: theme.trim() || null,
        wordCount: wordCount || null,
        essayLink: essayLink.trim() || null,
      };

      if (isEditMode && essay) {
        await apiPatch(`/essays/${essay.id}`, payload);
        showSuccess('Success', 'Essay updated successfully', 3000);
      } else {
        await apiPost(`/applications/${applicationId}/essays`, payload);
        showSuccess('Success', 'Essay created successfully', 3000);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save essay';
      showError('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>{isEditMode ? 'Edit Essay' : 'Add Essay'}</ModalHeader>
          <ModalCloseButton isDisabled={submitting} />
          <ModalBody>
            <Stack spacing="4">
              <FormControl>
                <FormLabel>Theme/Topic</FormLabel>
                <Input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., Leadership Experience, Community Service"
                />
                <FormHelperText>What is this essay about?</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Word Count</FormLabel>
                <NumberInput
                  value={wordCount}
                  onChange={(_, value) => setWordCount(isNaN(value) ? undefined : value)}
                  min={0}
                >
                  <NumberInputField placeholder="e.g., 500" />
                </NumberInput>
                <FormHelperText>Target or maximum word count</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Essay Link</FormLabel>
                <Input
                  type="url"
                  value={essayLink}
                  onChange={(e) => setEssayLink(e.target.value)}
                  placeholder="https://docs.google.com/document/..."
                />
                <FormHelperText>
                  Link to Google Docs or other online document
                </FormHelperText>
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="outline"
              mr={3}
              onClick={handleClose}
              isDisabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={submitting}
              loadingText={isEditMode ? 'Updating...' : 'Creating...'}
            >
              {isEditMode ? 'Update Essay' : 'Create Essay'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default EssayForm;
