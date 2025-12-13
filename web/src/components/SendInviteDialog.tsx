/**
 * SendInviteDialog Component
 * Confirmation dialog for sending collaboration invitations
 */

import React, { useState } from 'react';
import {
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  Button,
  Text,
  VStack,
  HStack,
  Box,
  Field,
  Input,
  Divider,
  Flex,
} from '@chakra-ui/react';
import { apiPost } from '../services/api';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

// Helper function to format dates without timezone conversion
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${month}/${day}/${year}`;
};

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

    // Determine if this is a resend operation
    const isResend = collaboration.status === 'invited' && collaboration.invite;

    try {
      setIsLoading(true);

      if (isResend) {
        // Call resend endpoint
        await apiPost(`/collaborations/${collaboration.id}/invite/resend`, {});
        showSuccess('Invitation Resent', `Invitation resent to ${collaboratorName || 'collaborator'}`);
      } else {
        // Call regular invite endpoint
        await apiPost(`/collaborations/${collaboration.id}/invite`, {});
        showSuccess('Invitation Sent', `Invitation sent to ${collaboratorName || 'collaborator'}`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : isResend ? 'Failed to resend invitation' : 'Failed to send invitation';
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

  const isResend = collaboration.status === 'invited' && collaboration.invite;

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
          maxW={{ base: '100vw', md: 'md' }}
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
            <span>{isResend ? 'Resend' : 'Send'} Collaboration Invitation</span>
            <HStack spacing="3">
              {!showSchedule ? (
                <>
                  <Button
                    variant="outline"
                    colorScheme="brand"
                    size="sm"
                    onClick={() => setShowSchedule(true)}
                    isDisabled={isLoading}
                  >
                    Schedule
                  </Button>
                  <Button
                    colorScheme="accent"
                    size="sm"
                    onClick={handleSendNow}
                    isLoading={isLoading}
                    loadingText={isResend ? 'Resending...' : 'Sending...'}
                  >
                    {isResend ? 'Resend' : 'Send Now'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    colorScheme="brand"
                    size="sm"
                    onClick={() => {
                      setShowSchedule(false);
                      setScheduledFor('');
                    }}
                    isDisabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    colorScheme="accent"
                    size="sm"
                    onClick={handleSchedule}
                    isLoading={isLoading}
                    loadingText="Scheduling..."
                    isDisabled={!scheduledFor}
                  >
                    Schedule
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                colorScheme="brand"
                size="sm"
                onClick={handleClose}
                isDisabled={isLoading}
              >
                Cancel
              </Button>
            </HStack>
          </Flex>
        </DialogHeader>
        <DialogCloseTrigger disabled={isLoading} />

        <DialogBody>
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
                  {formatDate(collaboration.nextActionDueDate)}
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
                <Field.Root required>
                  <Field.Label>Schedule For</Field.Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </Field.Root>
              </>
            )}
          </VStack>
        </DialogBody>
      </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
};

export default SendInviteDialog;
