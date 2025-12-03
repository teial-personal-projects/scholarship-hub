/**
 * SendInviteDialog Component
 * Confirmation dialog for sending collaboration invitations
 */

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  HStack,
  Box,
  FormControl,
  FormLabel,
  Input,
  Divider,
} from '@chakra-ui/react';
import { apiPost } from '../services/api';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface SendInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collaboration: CollaborationResponse | null;
  collaboratorName?: string;
  applicationName?: string;
  onSuccess?: () => void;
}

const SendInviteDialog: React.FC<SendInviteDialogProps> = ({
  isOpen,
  onClose,
  collaboration,
  collaboratorName,
  applicationName,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const [isLoading, setIsLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  const getCollaborationTypeLabel = (type: string) => {
    switch (type) {
      case 'recommendation':
        return 'Recommendation Letter';
      case 'essayReview':
        return 'Essay Review';
      case 'guidance':
        return 'Guidance/Counseling';
      default:
        return type;
    }
  };

  const handleSendNow = async () => {
    if (!collaboration) return;

    try {
      setIsLoading(true);
      await apiPost(`/collaborations/${collaboration.id}/invite`, {});

      showSuccess('Invitation Sent', `Invitation sent to ${collaboratorName || 'collaborator'}`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!collaboration || !scheduledFor) return;

    // Validate scheduled date is in the future
    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate < new Date()) {
      showError('Invalid Date', 'Please select a future date and time', 3000);
      return;
    }

    try {
      setIsLoading(true);
      await apiPost(`/collaborations/${collaboration.id}/invite/schedule`, {
        scheduledFor: scheduledDate.toISOString(),
      });

      showSuccess('Invitation Scheduled', `Invitation scheduled for ${scheduledDate.toLocaleString()}`);

      if (onSuccess) onSuccess();
      onClose();
      setShowSchedule(false);
      setScheduledFor('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule invitation';
      showError('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowSchedule(false);
    setScheduledFor('');
    onClose();
  };

  if (!collaboration) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Send Collaboration Invitation</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Collaborator
              </Text>
              <Text fontWeight="semibold">{collaboratorName || 'Unknown'}</Text>
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Collaboration Type
              </Text>
              <Text fontWeight="semibold">
                {getCollaborationTypeLabel(collaboration.collaborationType)}
              </Text>
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Application
              </Text>
              <Text fontWeight="semibold">{applicationName || 'Unknown'}</Text>
            </Box>

            {collaboration.nextActionDueDate && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>
                  Due Date
                </Text>
                <Text fontWeight="semibold">
                  {new Date(collaboration.nextActionDueDate).toLocaleDateString()}
                </Text>
              </Box>
            )}

            {collaboration.notes && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>
                  Notes
                </Text>
                <Text fontSize="sm">{collaboration.notes}</Text>
              </Box>
            )}

            {showSchedule && (
              <>
                <Divider />
                <FormControl isRequired>
                  <FormLabel>Schedule For</FormLabel>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </FormControl>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose} isDisabled={isLoading}>
              Cancel
            </Button>

            {!showSchedule ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowSchedule(true)}
                  isDisabled={isLoading}
                >
                  Schedule for Later
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleSendNow}
                  isLoading={isLoading}
                  loadingText="Sending..."
                >
                  Send Now
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSchedule(false);
                    setScheduledFor('');
                  }}
                  isDisabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleSchedule}
                  isLoading={isLoading}
                  loadingText="Scheduling..."
                  isDisabled={!scheduledFor}
                >
                  Schedule
                </Button>
              </>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SendInviteDialog;
