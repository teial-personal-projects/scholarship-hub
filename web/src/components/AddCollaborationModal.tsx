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
  Select,
  Textarea,
  Stack,
  Input,
  Text,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { apiGet, apiPost } from '../services/api';
import type { CollaboratorResponse, EssayResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface AddCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  essays: EssayResponse[];
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
  const [essayId, setEssayId] = useState<number | null>(null);
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
      setEssayId(null);
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

    if (collaborationType === 'essayReview' && !essayId) {
      showError('Validation Error', 'Please select an essay for review');
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
      if (collaborationType === 'essayReview' && essayId) {
        payload.essayId = essayId;
      }

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
        if ((err as any).errorDetails?.originalError && process.env.NODE_ENV === 'development') {
          errorMessage += `\n\nDetails: ${JSON.stringify((err as any).errorDetails.originalError, null, 2)}`;
        }
      }
      showError('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Collaborator</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing="4">
            {collaborators.length === 0 && !loading && (
              <Alert status="info">
                <AlertIcon />
                <Text>
                  You don't have any saved collaborators yet. Add collaborators from the Collaborators page first.
                </Text>
              </Alert>
            )}

            <FormControl isRequired>
              <FormLabel>Collaborator</FormLabel>
              <Select
                placeholder="Select collaborator"
                value={collaboratorId || ''}
                onChange={(e) => setCollaboratorId(parseInt(e.target.value, 10))}
                isDisabled={loading}
              >
                {collaborators.map((collab) => (
                  <option key={collab.id} value={collab.id}>
                    {collab.name} ({collab.emailAddress}) - {collab.relationship}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Collaboration Type</FormLabel>
              <Select
                value={collaborationType}
                onChange={(e) => setCollaborationType(e.target.value as 'recommendation' | 'essayReview' | 'guidance')}
              >
                <option value="recommendation">Recommendation Letter</option>
                <option value="essayReview">Essay Review</option>
                <option value="guidance">Guidance/Counseling</option>
              </Select>
            </FormControl>

            {collaborationType === 'essayReview' && (
              <FormControl isRequired>
                <FormLabel>Essay to Review</FormLabel>
                {essays.length === 0 ? (
                  <Alert status="warning">
                    <AlertIcon />
                    <Text>No essays available. Please add an essay first before requesting a review.</Text>
                  </Alert>
                ) : (
                  <Select
                    placeholder="Select essay"
                    value={essayId || ''}
                    onChange={(e) => setEssayId(parseInt(e.target.value, 10))}
                  >
                    {essays.map((essay) => (
                      <option key={essay.id} value={essay.id}>
                        {essay.title}
                      </option>
                    ))}
                  </Select>
                )}
              </FormControl>
            )}

            {collaborationType === 'recommendation' && (
              <FormControl>
                <FormLabel>Recommendation Portal URL</FormLabel>
                <Input
                  placeholder="https://..."
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                />
              </FormControl>
            )}

            {collaborationType === 'guidance' && (
              <>
                <FormControl>
                  <FormLabel>Session Type</FormLabel>
                  <Select
                    placeholder="Select session type"
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value as 'one-on-one' | 'group' | 'workshop' | '')}
                  >
                    <option value="one-on-one">One-on-One</option>
                    <option value="group">Group</option>
                    <option value="workshop">Workshop</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Meeting URL</FormLabel>
                  <Input
                    placeholder="https://..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Scheduled For</FormLabel>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </FormControl>
              </>
            )}

            <FormControl isRequired={collaborationType === 'recommendation'}>
              <FormLabel>Due Date{collaborationType === 'recommendation' ? '' : ' (Optional)'}</FormLabel>
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
            loadingText="Adding..."
            isDisabled={
              !collaboratorId ||
              (collaborationType === 'essayReview' && !essayId) ||
              (collaborationType === 'recommendation' && !nextActionDueDate)
            }
          >
            Add Collaborator
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default AddCollaborationModal;
