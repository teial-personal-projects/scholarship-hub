/**
 * CollaboratorInvite Page
 * Landing page when collaborators click invitation link from email
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardBody,
  Heading,
  Text,
  Stack,
  Button,
  HStack,
  Box,
  Badge,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { apiGet, apiPost } from '../services/api';
import { useToastHelpers } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';
import { formatDateNoTimezone } from '../utils/date';

interface InviteDetails {
  collaboration: {
    id: number;
    collaborationType: string;
    applicationId: number;
    essayId?: number;
    nextActionDueDate?: string;
    notes?: string;
  };
  student: {
    firstName: string;
    lastName: string;
    email: string;
  };
  application: {
    scholarshipName: string;
    organization?: string;
  };
  inviteToken: string;
  expiresAt: string;
}

function CollaboratorInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToastHelpers();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInviteDetails();
    }
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // GET /api/invites/:token
      const data = await apiGet<InviteDetails>(`/invites/${token}`);
      setInviteDetails(data);

      // Check if invite is expired
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setError('This invitation has expired. Please contact the student for a new invitation.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invitation';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      // POST /api/invites/:token/accept
      await apiPost(`/invites/${token}/accept`, {});
      showSuccess('Success', 'Invitation accepted successfully');

      // Redirect to collaborator dashboard
      navigate('/collaborator/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation';
      showError('Error', errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;

    try {
      setDeclining(true);
      // POST /api/invites/:token/decline
      await apiPost(`/invites/${token}/decline`, {});
      showSuccess('Declined', 'You have declined this invitation');

      // Redirect to home or dashboard
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline invitation';
      showError('Error', errorMessage);
    } finally {
      setDeclining(false);
    }
  };

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

  if (loading) {
    return (
      <Container maxW="2xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading invitation...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !inviteDetails) {
    return (
      <Container maxW="2xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          minHeight="200px"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Invalid or Expired Invitation
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            {error || 'This invitation is no longer valid. Please contact the student who sent you this invitation.'}
          </AlertDescription>
          <Button mt={6} colorScheme="blue" onClick={() => navigate('/')}>
            Go to Home
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="2xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
      <Card>
        <CardBody>
          <Stack spacing={{ base: '4', md: '6' }}>
            <Box textAlign="center">
              <Heading size={{ base: 'md', md: 'lg' }} mb="2">
                Collaboration Invitation
              </Heading>
              <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
                You've been invited to help a student with their scholarship application
              </Text>
            </Box>

            <Divider />

            {/* Student Information */}
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                From
              </Text>
              <Text fontWeight="semibold" fontSize="lg">
                {inviteDetails.student.firstName} {inviteDetails.student.lastName}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {inviteDetails.student.email}
              </Text>
            </Box>

            {/* Collaboration Type */}
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Help Needed
              </Text>
              <Badge colorScheme="blue" fontSize="md" py={1} px={2}>
                {getCollaborationTypeLabel(inviteDetails.collaboration.collaborationType)}
              </Badge>
            </Box>

            {/* Application Information */}
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Scholarship Application
              </Text>
              <Text fontWeight="semibold">
                {inviteDetails.application.scholarshipName}
              </Text>
              {inviteDetails.application.organization && (
                <Text fontSize="sm" color="gray.500">
                  {inviteDetails.application.organization}
                </Text>
              )}
            </Box>

            {/* Due Date */}
            {inviteDetails.collaboration.nextActionDueDate && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>
                  Due Date
                </Text>
                <Text fontWeight="semibold">
                  {formatDateNoTimezone(inviteDetails.collaboration.nextActionDueDate)}
                </Text>
              </Box>
            )}

            {/* Notes */}
            {inviteDetails.collaboration.notes && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>
                  Additional Notes
                </Text>
                <Text whiteSpace="pre-wrap" bg="gray.50" p={3} borderRadius="md">
                  {inviteDetails.collaboration.notes}
                </Text>
              </Box>
            )}

            <Divider />

            {/* Authentication Status */}
            {!user && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle fontSize="sm">Account Required</AlertTitle>
                  <AlertDescription fontSize="sm">
                    You'll need to create an account or log in to accept this invitation.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {/* Action Buttons */}
            <Stack spacing={3} direction={{ base: 'column', md: 'row' }} justify="center">
              <Button
                variant="outline"
                onClick={handleDecline}
                isLoading={declining}
                loadingText="Declining..."
                isDisabled={accepting}
                size={{ base: 'md', md: 'lg' }}
                width={{ base: '100%', md: 'auto' }}
              >
                Decline
              </Button>
              <Button
                colorScheme="blue"
                onClick={user ? handleAccept : () => navigate('/login', { state: { from: `/invite/${token}` } })}
                isLoading={accepting}
                loadingText="Accepting..."
                isDisabled={declining}
                size={{ base: 'md', md: 'lg' }}
                width={{ base: '100%', md: 'auto' }}
              >
                {user ? 'Accept Invitation' : 'Log In to Accept'}
              </Button>
            </Stack>

            {/* Expiration Notice */}
            {inviteDetails.expiresAt && (
              <Text fontSize="sm" color="gray.500" textAlign="center">
                This invitation expires on{' '}
                {new Date(inviteDetails.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </Stack>
        </CardBody>
      </Card>
    </Container>
  );
}

export default CollaboratorInvite;
