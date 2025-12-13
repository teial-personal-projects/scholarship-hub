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
  Textarea,
  Stack,
  HStack,
  Flex,
  NativeSelect,
} from '@chakra-ui/react';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';
import { useUpdateCollaboration } from '../hooks/useCollaborations';

interface EditCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboration: CollaborationResponse | null;
  onSuccess?: () => void; // Now optional since React Query handles refetching
}

function EditCollaborationModal({
  isOpen,
  onClose,
  collaboration,
  onSuccess,
}: EditCollaborationModalProps) {
  const { showSuccess, showError } = useToastHelpers();
  const updateCollaboration = useUpdateCollaboration();

  // Form state
  const [status, setStatus] = useState('');
  const [nextActionDueDate, setNextActionDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [portalUrl, setPortalUrl] = useState('');

  // Initialize form with collaboration data
  useEffect(() => {
    if (collaboration && isOpen) {
      setStatus(collaboration.status);
      setNextActionDueDate(
        collaboration.nextActionDueDate
          ? collaboration.nextActionDueDate.split('T')[0]
          : ''
      );
      setNotes(collaboration.notes || '');
      setPortalUrl(collaboration.portalUrl || '');
    }
  }, [collaboration, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStatus('');
      setNextActionDueDate('');
      setNotes('');
      setPortalUrl('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!collaboration) return;

    // Validate: Due date is required for recommendation collaborations
    if (collaboration.collaborationType === 'recommendation' && !nextActionDueDate) {
      showError('Validation Error', 'Due date is required for recommendation collaborations');
      return;
    }

    const payload: Record<string, unknown> = {};

    // Add status if changed
    if (status !== collaboration.status) {
      payload.status = status;
      // Clear awaitingActionFrom if marking as completed
      if (status === 'completed') {
        payload.awaitingActionFrom = null;
      }
    }

    // Always include due date for recommendations, optional for others
    if (collaboration.collaborationType === 'recommendation') {
      payload.nextActionDueDate = nextActionDueDate;
    } else if (nextActionDueDate) {
      payload.nextActionDueDate = nextActionDueDate;
    }

    // Add notes if changed
    if (notes !== (collaboration.notes || '')) {
      // Use null when cleared so backend persists the change (and logs history)
      payload.notes = notes.trim() ? notes : null;
    }

    // Add type-specific fields
    if (collaboration.collaborationType === 'recommendation') {
      if (portalUrl !== (collaboration.portalUrl || '')) {
        payload.portalUrl = portalUrl || undefined;
      }
    }

    updateCollaboration.mutate(
      { id: collaboration.id, data: payload },
      {
        onSuccess: () => {
          showSuccess('Success', 'Collaboration updated successfully', 3000);
          onSuccess?.(); // Call onSuccess if provided
          onClose();
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update collaboration';
          showError('Error', errorMessage);
        },
      }
    );
  };

  if (!collaboration) return null;

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) onClose();
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
          maxW={{ base: '100vw', md: 'xl' }}
        >
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
            <span>Edit Collaboration</span>
            <HStack gap="3">
              <Button
                colorPalette="accent"
                size="sm"
                onClick={handleSubmit}
                loading={updateCollaboration.isPending}
                loadingText="Saving..."
                disabled={
                  collaboration.collaborationType === 'recommendation' && !nextActionDueDate
                }
              >
                Save
              </Button>
              <Button
                variant="outline"
                colorPalette="brand"
                size="sm"
                onClick={onClose}
                disabled={updateCollaboration.isPending}
              >
                Cancel
              </Button>
            </HStack>
          </Flex>
        </DialogHeader>
        <DialogCloseTrigger disabled={updateCollaboration.isPending} />
        <DialogBody>
          <Stack gap="4">
            <Field.Root>
              <Field.Label>Collaboration Type</Field.Label>
              <Input
                value={collaboration.collaborationType}
                disabled
                readOnly
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Status</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="invited">Invited</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="completed">Completed</option>
                  <option value="declined">Declined</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            {collaboration.collaborationType === 'recommendation' && (
              <Field.Root>
                <Field.Label>Recommendation Portal URL</Field.Label>
                <Input
                  placeholder="https://..."
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                />
              </Field.Root>
            )}

            <Field.Root required={collaboration.collaborationType === 'recommendation'}>
              <Field.Label>
                Due Date{collaboration.collaborationType === 'recommendation' ? '' : ' (Optional)'}
              </Field.Label>
              <Input
                type="date"
                value={nextActionDueDate}
                onChange={(e) => setNextActionDueDate(e.target.value)}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Notes (Optional)</Field.Label>
              <Textarea
                placeholder="Add any additional notes or instructions for the collaborator..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Field.Root>
          </Stack>
        </DialogBody>
      </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}

export default EditCollaborationModal;
