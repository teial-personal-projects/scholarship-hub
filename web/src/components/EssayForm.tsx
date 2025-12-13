import { useState, useEffect } from 'react';
import {
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  Button,
  Field,
  Input,
  NumberInput,
  NumberInputField,
  Stack,
  HStack,
  Flex,
  Select,
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
  const [status, setStatus] = useState('not_started');

  useEffect(() => {
    if (essay) {
      setTheme(essay.theme || '');
      setWordCount(essay.wordCount || undefined);
      setEssayLink(essay.essayLink || '');
      setStatus(essay.status || 'not_started');
    } else {
      // Reset form when opening for new essay
      setTheme('');
      setWordCount(undefined);
      setEssayLink('');
      setStatus('not_started');
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
        status,
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
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) handleClose();
      }}
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent
          mx={{ base: 0, md: 'auto' }}
          my={{ base: 0, md: 'auto' }}
          maxH={{ base: '100vh', md: '90vh' }}
          overflowY="auto"
          w={{ base: '100vw', md: 'auto' }}
          maxW={{ base: '100vw', md: 'lg' }}
        >
        <form id="essay-form" onSubmit={handleSubmit}>
          <DialogHeader
            position="sticky"
            top="0"
            zIndex={10}
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
          >
            <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
              <span>{isEditMode ? 'Edit Essay' : 'Add Essay'}</span>
              <HStack gap="3">
                <Button
                  type="submit"
                  form="essay-form"
                  colorPalette="accent"
                  size="sm"
                  loading={submitting}
                  loadingText={isEditMode ? 'Updating...' : 'Creating...'}
                >
                  {isEditMode ? 'Update' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  colorPalette="brand"
                  size="sm"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </HStack>
            </Flex>
          </DialogHeader>
          <DialogCloseTrigger disabled={submitting} />
          <DialogBody>
            <Stack gap="4">
              <Field.Root>
                <Field.Label>Theme/Topic</Field.Label>
                <Input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., Leadership Experience, Community Service"
                />
                <Field.HelperText>What is this essay about?</Field.HelperText>
              </Field.Root>

              <Field.Root>
                <Field.Label>Word Count</Field.Label>
                <NumberInput
                  value={wordCount}
                  onChange={(_, value) => setWordCount(isNaN(value) ? undefined : value)}
                  min={0}
                >
                  <NumberInputField placeholder="e.g., 500" />
                </NumberInput>
                <Field.HelperText>Target or maximum word count</Field.HelperText>
              </Field.Root>

              <Field.Root>
                <Field.Label>Essay Link</Field.Label>
                <Input
                  type="url"
                  value={essayLink}
                  onChange={(e) => setEssayLink(e.target.value)}
                  placeholder="https://docs.google.com/document/..."
                />
                <Field.HelperText>
                  Link to Google Docs or other online document
                </Field.HelperText>
              </Field.Root>

              <Field.Root>
                <Field.Label>Status</Field.Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </Select>
                <Field.HelperText>Current status of this essay</Field.HelperText>
              </Field.Root>
            </Stack>
          </DialogBody>
        </form>
      </DialogContent>
    </DialogPositioner>
  </DialogRoot>
  );
}

export default EssayForm;
