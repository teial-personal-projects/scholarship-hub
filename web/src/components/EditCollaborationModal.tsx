import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Stack,
  HStack,
  Flex,
  Select,
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
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'xl' }} isCentered>
      <ModalOverlay />
      <ModalContent mx={{ base: 0, md: 'auto' }} my={{ base: 0, md: 'auto' }} maxH={{ base: '100vh', md: '90vh' }} overflowY="auto">
        <ModalHeader
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
            <HStack spacing="3">
              <Button
                colorScheme="accent"
                size="sm"
                onClick={handleSubmit}
                isLoading={updateCollaboration.isPending}
                loadingText="Saving..."
                isDisabled={
                  collaboration.collaborationType === 'recommendation' && !nextActionDueDate
                }
              >
                Save
              </Button>
              <Button
                variant="outline"
                colorScheme="brand"
                size="sm"
                onClick={onClose}
                isDisabled={updateCollaboration.isPending}
              >
                Cancel
              </Button>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton isDisabled={updateCollaboration.isPending} />
        <ModalBody>
          <Stack spacing="4">
            <FormControl>
              <FormLabel>Collaboration Type</FormLabel>
              <Input
                value={collaboration.collaborationType}
                isDisabled
                variant="filled"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="invited">Invited</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </Select>
            </FormControl>

            {collaboration.collaborationType === 'recommendation' && (
              <FormControl>
                <FormLabel>Recommendation Portal URL</FormLabel>
                <Input
                  placeholder="https://..."
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                />
              </FormControl>
            )}

            <FormControl isRequired={collaboration.collaborationType === 'recommendation'}>
              <FormLabel>
                Due Date{collaboration.collaborationType === 'recommendation' ? '' : ' (Optional)'}
              </FormLabel>
              <Input
                type="date"
                value={nextActionDueDate}
                onChange={(e) => setNextActionDueDate(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes (Optional)</FormLabel>
              <Textarea
                placeholder="Add any additional notes or instructions for the collaborator..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </FormControl>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default EditCollaborationModal;
