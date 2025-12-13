/**
 * AssignCollaboratorModal Component
 * Modal for assigning an existing collaborator to an application or essay
 */

import React, { useState, useEffect } from 'react';
import {
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  Button,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  Input,
  VStack,
  Text,
  HStack,
  Flex,
} from '@chakra-ui/react';
import { apiPost } from '../services/api';
import { useToastHelpers } from '../utils/toast';
import { useCollaborators } from '../hooks/useCollaborators';

interface AssignCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  onSuccess?: () => void;
}

const AssignCollaboratorModal: React.FC<AssignCollaboratorModalProps> = ({
  isOpen,
  onClose,
  applicationId,
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
      setCollaborationType('recommendation');
      setNotes('');
      setNextActionDueDate('');
    }
  }, [isOpen, fetchCollaborators]);

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
          maxW={{ base: '100vw', md: 'md' }}
        >
        <form id="assign-collaborator-form" onSubmit={handleSubmit}>
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
              <span>Assign Collaborator</span>
              <HStack spacing="3">
                <Button
                  type="submit"
                  form="assign-collaborator-form"
                  colorScheme="accent"
                  size="sm"
                  isLoading={isLoading}
                  loadingText="Assigning..."
                  isDisabled={collaborators.length === 0}
                >
                  Assign
                </Button>
                <Button
                  variant="outline"
                  colorScheme="brand"
                  size="sm"
                  onClick={onClose}
                  isDisabled={isLoading}
                >
                  Cancel
                </Button>
              </HStack>
            </Flex>
          </DialogHeader>
          <DialogCloseTrigger disabled={isLoading} />

          <DialogBody>
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
          </DialogBody>
        </form>
      </DialogContent>
    </DialogPositioner>
  </DialogRoot>
  );
};

export default AssignCollaboratorModal;
