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
  Select,
  Textarea,
  Stack,
  Input,
  Text,
  Alert,
  AlertIcon,
  HStack,
  Flex,
} from '@chakra-ui/react';
import { apiGet, apiPost } from '../services/api';
import type { CollaboratorResponse, EssayResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface AddCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  essays: EssayResponse[]; // kept for backward compatibility; no longer used for essayReview selection
  onSuccess: () => void;
}

function AddCollaborationModal({
  isOpen,
  onClose,
  applicationId,
  essays,
  onSuccess,
}: AddCollaborationModalProps) {
  const { showSuccess, showError } = useToastHelpers();

  // Form state
  const [collaboratorId, setCollaboratorId] = useState<number | null>(null);
  const [collaborationType, setCollaborationType] = useState<'recommendation' | 'essayReview' | 'guidance'>('recommendation');
  const [nextActionDueDate, setNextActionDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [sessionType, setSessionType] = useState<'one-on-one' | 'group' | 'workshop' | ''>('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [portalUrl, setPortalUrl] = useState('');

  // Data state
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch user's collaborators
  useEffect(() => {
    async function fetchCollaborators() {
      if (!isOpen) return;

      try {
        setLoading(true);
        const data = await apiGet<CollaboratorResponse[]>('/collaborators');
        setCollaborators(data || []);
      } catch (err) {
        showError('Error', 'Failed to load collaborators');
      } finally {
        setLoading(false);
      }
    }

    fetchCollaborators();
  }, [isOpen, showError]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCollaboratorId(null);
      setCollaborationType('recommendation');
      setNextActionDueDate('');
      setNotes('');
      setSessionType('');
      setMeetingUrl('');
      setScheduledFor('');
      setPortalUrl('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!collaboratorId) {
      showError('Validation Error', 'Please select a collaborator');
      return;
    }

    if (collaborationType === 'recommendation' && !nextActionDueDate) {
      showError('Validation Error', 'Due date is required for recommendation collaborations');
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        collaboratorId,
        applicationId,
        collaborationType,
        status: 'pending',
        awaitingActionFrom: 'student',
        awaitingActionType: 'send_invite',
        nextActionDescription: 'Send invitation to collaborator',
        notes: notes || undefined,
      };

      // Add due date (required for recommendations, optional for others)
      // Always include it for recommendations so backend can validate
      if (collaborationType === 'recommendation') {
        payload.nextActionDueDate = nextActionDueDate;
      } else if (nextActionDueDate) {
        payload.nextActionDueDate = nextActionDueDate;
      }

      // Add type-specific fields
      if (collaborationType === 'guidance') {
        if (sessionType) {
          payload.sessionType = sessionType;
        }
        if (meetingUrl) {
          payload.meetingUrl = meetingUrl;
        }
        if (scheduledFor) {
          payload.scheduledFor = new Date(scheduledFor).toISOString();
        }
      }

      if (collaborationType === 'recommendation') {
        if (portalUrl) {
          payload.portalUrl = portalUrl;
        }
      }

      await apiPost('/collaborations', payload);

      showSuccess('Success', 'Collaboration added successfully', 3000);
      onSuccess();
      onClose();
    } catch (err) {
      let errorMessage = 'Failed to add collaboration';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Include error details if available (for debugging)
        const errorWithDetails = err as Error & { errorDetails?: { originalError?: unknown } };
        if (errorWithDetails.errorDetails?.originalError && process.env.NODE_ENV === 'development') {
          errorMessage += `\n\nDetails: ${JSON.stringify(errorWithDetails.errorDetails.originalError, null, 2)}`;
        }
      }
      showError('Error', errorMessage);
    } finally {
      setSaving(false);
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
            <span>Add Collaborator</span>
            <HStack spacing="3">
              <Button
                colorScheme="accent"
                size="sm"
                onClick={handleSubmit}
                isLoading={saving}
                loadingText="Adding..."
                isDisabled={
                  !collaboratorId ||
                  (collaborationType === 'recommendation' && !nextActionDueDate)
                }
              >
                Add
              </Button>
              <Button
                variant="outline"
                colorScheme="brand"
                size="sm"
                onClick={onClose}
                isDisabled={saving}
              >
                Cancel
              </Button>
            </HStack>
          </Flex>
        </DialogHeader>
        <DialogCloseTrigger disabled={saving} />
        <DialogBody>
          <Stack spacing="4">
            {collaborators.length === 0 && !loading && (
              <Alert status="info">
                <AlertIcon />
                <Text>
                  You don't have any saved collaborators yet. Add collaborators from the Collaborators page first.
                </Text>
              </Alert>
            )}

            <Field.Root required>
              <Field.Label>Collaborator</Field.Label>
              <Select
                placeholder="Select collaborator"
                value={collaboratorId || ''}
                onChange={(e) => setCollaboratorId(parseInt(e.target.value, 10))}
                isDisabled={loading}
              >
                {collaborators.map((collab) => (
                  <option key={collab.id} value={collab.id}>
                    {collab.firstName} {collab.lastName} ({collab.emailAddress}) - {collab.relationship || 'No relationship'}
                  </option>
                ))}
              </Select>
            </Field.Root>

            <Field.Root required>
              <Field.Label>Collaboration Type</Field.Label>
              <Select
                value={collaborationType}
                onChange={(e) => setCollaborationType(e.target.value as 'recommendation' | 'essayReview' | 'guidance')}
              >
                <option value="recommendation">Recommendation Letter</option>
                <option value="essayReview">Essay Review</option>
                <option value="guidance">Guidance/Counseling</option>
              </Select>
            </Field.Root>

            {/* Essay review collaborations no longer link to a specific essay */}

            {collaborationType === 'recommendation' && (
              <Field.Root>
                <Field.Label>Recommendation Portal URL</Field.Label>
                <Input
                  placeholder="https://..."
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                />
              </Field.Root>
            )}

            {collaborationType === 'guidance' && (
              <>
                <Field.Root>
                  <Field.Label>Session Type</Field.Label>
                  <Select
                    placeholder="Select session type"
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value as 'one-on-one' | 'group' | 'workshop' | '')}
                  >
                    <option value="one-on-one">One-on-One</option>
                    <option value="group">Group</option>
                    <option value="workshop">Workshop</option>
                  </Select>
                </Field.Root>

                <Field.Root>
                  <Field.Label>Meeting URL</Field.Label>
                  <Input
                    placeholder="https://..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Scheduled For</Field.Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </Field.Root>
              </>
            )}

            <Field.Root required={collaborationType === 'recommendation'}>
              <Field.Label>Due Date{collaborationType === 'recommendation' ? '' : ' (Optional)'}</Field.Label>
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

export default AddCollaborationModal;
