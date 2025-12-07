import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Stack,
} from '@chakra-ui/react';
import { apiPatch } from '../services/api';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface EditCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboration: CollaborationResponse | null;
  onSuccess: () => void;
}

function EditCollaborationModal({
  isOpen,
  onClose,
  collaboration,
  onSuccess,
}: EditCollaborationModalProps) {
  const { showSuccess, showError } = useToastHelpers();

  // Form state
  const [nextActionDueDate, setNextActionDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form with collaboration data
  useEffect(() => {
    if (collaboration && isOpen) {
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

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {};

      // Always include due date for recommendations, optional for others
      if (collaboration.collaborationType === 'recommendation') {
        payload.nextActionDueDate = nextActionDueDate;
      } else if (nextActionDueDate) {
        payload.nextActionDueDate = nextActionDueDate;
      }

      // Add notes if changed
      if (notes !== (collaboration.notes || '')) {
        payload.notes = notes || undefined;
      }

      // Add type-specific fields
      if (collaboration.collaborationType === 'recommendation') {
        if (portalUrl !== (collaboration.portalUrl || '')) {
          payload.portalUrl = portalUrl || undefined;
        }
      }

      await apiPatch(`/collaborations/${collaboration.id}`, payload);

      showSuccess('Success', 'Collaboration updated successfully', 3000);
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update collaboration';
      showError('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!collaboration) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Collaboration</ModalHeader>
        <ModalCloseButton />
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

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={saving}
            loadingText="Saving..."
            isDisabled={
              collaboration.collaborationType === 'recommendation' && !nextActionDueDate
            }
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default EditCollaborationModal;
