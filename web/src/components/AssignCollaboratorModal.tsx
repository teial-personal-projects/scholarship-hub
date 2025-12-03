/**
 * AssignCollaboratorModal Component
 * Modal for assigning an existing collaborator to an application or essay
 */

import React, { useState, useEffect } from 'react';
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
  Select,
  Textarea,
  Input,
  VStack,
  Text,
} from '@chakra-ui/react';
import { apiPost } from '../services/api';
import { useToastHelpers } from '../utils/toast';
import { useCollaborators } from '../hooks/useCollaborators';

interface AssignCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  essayId?: number; // Optional - if assigning to specific essay
  onSuccess?: () => void;
}

const AssignCollaboratorModal: React.FC<AssignCollaboratorModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  essayId,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const { collaborators, loading: loadingCollaborators, fetchCollaborators } = useCollaborators();
  const [isLoading, setIsLoading] = useState(false);

  const [collaboratorId, setCollaboratorId] = useState('');
  const [collaborationType, setCollaborationType] = useState<'recommendation' | 'essayReview' | 'guidance'>('recommendation');
  const [notes, setNotes] = useState('');
  const [nextActionDueDate, setNextActionDueDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
      // Reset form
      setCollaboratorId('');
      setCollaborationType(essayId ? 'essayReview' : 'recommendation');
      setNotes('');
      setNextActionDueDate('');
    }
  }, [isOpen, essayId, fetchCollaborators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!collaboratorId) {
      showError('Validation Error', 'Please select a collaborator', 3000);
      return;
    }

    if (!collaborationType) {
      showError('Validation Error', 'Please select a collaboration type', 3000);
      return;
    }

    // If essay review type, essayId is required
    if (collaborationType === 'essayReview' && !essayId) {
      showError('Validation Error', 'Essay ID is required for essay review collaborations', 3000);
      return;
    }

    const payload: any = {
      collaboratorId: parseInt(collaboratorId),
      applicationId,
      collaborationType,
      status: 'pending',
      awaitingActionFrom: 'student',
      awaitingActionType: 'send_invitation',
    };

    if (notes.trim()) {
      payload.notes = notes.trim();
    }

    if (nextActionDueDate) {
      payload.nextActionDueDate = nextActionDueDate;
    }

    // Add essayId if this is an essay review
    if (collaborationType === 'essayReview' && essayId) {
      payload.essayId = essayId;
    }

    try {
      setIsLoading(true);
      await apiPost('/collaborations', payload);
      showSuccess('Success', 'Collaborator assigned successfully', 3000);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign collaborator';
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Assign Collaborator</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Select Collaborator</FormLabel>
                <Select
                  placeholder="Choose a collaborator"
                  value={collaboratorId}
                  onChange={(e) => setCollaboratorId(e.target.value)}
                  isDisabled={loadingCollaborators}
                >
                  {collaborators.map((collab) => (
                    <option key={collab.id} value={collab.id}>
                      {collab.firstName} {collab.lastName} ({collab.emailAddress})
                    </option>
                  ))}
                </Select>
                {collaborators.length === 0 && !loadingCollaborators && (
                  <Text fontSize="sm" color="gray.500" mt={2}>
                    No collaborators found. Please add a collaborator first.
                  </Text>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Collaboration Type</FormLabel>
                <Select
                  value={collaborationType}
                  onChange={(e) => setCollaborationType(e.target.value as any)}
                >
                  <option value="recommendation">Recommendation Letter</option>
                  <option value="essayReview">Essay Review</option>
                  <option value="guidance">Guidance/Counseling</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Due Date</FormLabel>
                <Input
                  type="date"
                  value={nextActionDueDate}
                  onChange={(e) => setNextActionDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or instructions for the collaborator..."
                  rows={4}
                />
              </FormControl>

              <Text fontSize="sm" color="gray.600">
                After assigning, you can send an invitation email to the collaborator from the application details page.
              </Text>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isLoading}
              loadingText="Assigning..."
              isDisabled={collaborators.length === 0}
            >
              Assign
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AssignCollaboratorModal;
