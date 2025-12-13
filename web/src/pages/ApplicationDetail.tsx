import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Stack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Badge,
  Flex,
  Divider,
  SimpleGrid,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Link as ChakraLink,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { apiGet, apiDelete, apiPatch } from '../services/api';
import type { ApplicationResponse, EssayResponse, CollaborationResponse, CollaboratorResponse } from '@scholarship-hub/shared';
import EssayForm from '../components/EssayForm';
import SendInviteDialog from '../components/SendInviteDialog';
import CollaborationHistory from '../components/CollaborationHistory';
import AddCollaborationModal from '../components/AddCollaborationModal';
import EditCollaborationModal from '../components/EditCollaborationModal';
import { formatDateNoTimezone } from '../utils/date';
import { useToastHelpers } from '../utils/toast';

function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [essays, setEssays] = useState<EssayResponse[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Essay management
  const { isOpen: isEssayFormOpen, onOpen: onEssayFormOpen, onClose: onEssayFormClose } = useDisclosure();
  const [selectedEssay, setSelectedEssay] = useState<EssayResponse | null>(null);
  const [deleteEssayId, setDeleteEssayId] = useState<number | null>(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Collaboration deletion
  const [deleteCollaborationId, setDeleteCollaborationId] = useState<number | null>(null);
  const { isOpen: isDeleteCollabOpen, onOpen: onDeleteCollabOpen, onClose: onDeleteCollabClose } = useDisclosure();
  const cancelCollabRef = useRef<HTMLButtonElement>(null);

  // Collaboration invitation
  const { isOpen: isInviteDialogOpen, onOpen: onInviteDialogOpen, onClose: onInviteDialogClose } = useDisclosure();
  const [selectedCollaboration, setSelectedCollaboration] = useState<CollaborationResponse | null>(null);

  // Collaboration history
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  const [historyCollaborationId, setHistoryCollaborationId] = useState<number | null>(null);

  // Add collaboration modal
  const { isOpen: isAddCollabOpen, onOpen: onAddCollabOpen, onClose: onAddCollabClose } = useDisclosure();
  
  // Edit collaboration modal
  const { isOpen: isEditCollabOpen, onOpen: onEditCollabOpen, onClose: onEditCollabClose } = useDisclosure();
  const [selectedCollaborationForEdit, setSelectedCollaborationForEdit] = useState<CollaborationResponse | null>(null);
  const prevIsEditCollabOpenRef = useRef(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch application details
        const appData = await apiGet<ApplicationResponse>(`/applications/${id}`);
        setApplication(appData);

        // Fetch essays for this application
        try {
          const essaysData = await apiGet<EssayResponse[]>(`/applications/${id}/essays`);
          setEssays(essaysData || []);
        } catch (err) {
          // If no essays exist, that's okay
          setEssays([]);
        }

        // Fetch collaborations for this application
        try {
          const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
          setCollaborations(collabsData || []);

          // Extract collaborator data from collaboration responses
          // Collaborator data is now included in each collaboration response
          if (collabsData && collabsData.length > 0) {
            const collaboratorMap = new Map<number, CollaboratorResponse>();
            // Type for collaboration response that may include collaborator data
            type CollaborationWithCollaborator = CollaborationResponse & {
              collaborator?: CollaboratorResponse;
            };
            for (const collab of collabsData) {
              // Check if collaborator is in the response
              const collabWithCollaborator = collab as CollaborationWithCollaborator;
              if (collabWithCollaborator.collaborator?.id) {
                // Use collaborator from response
                collaboratorMap.set(collabWithCollaborator.collaborator.id, collabWithCollaborator.collaborator);
              } else if (!collaboratorMap.has(collab.collaboratorId)) {
                // Fallback: fetch collaborator if not in response
                try {
                  const collaboratorData = await apiGet<CollaboratorResponse>(`/collaborators/${collab.collaboratorId}`);
                  collaboratorMap.set(collab.collaboratorId, collaboratorData);
                } catch (err) {
                  // If collaborator fetch fails, continue with others
                  console.error(`Failed to fetch collaborator ${collab.collaboratorId}:`, err);
                }
              }
            }
            setCollaborators(collaboratorMap);
          }
        } catch (err) {
          // If no collaborations exist, that's okay
          setCollaborations([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load application';
        setError(errorMessage);
        showError('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, showError]);

  // Essay management handlers
  const handleAddEssay = () => {
    setSelectedEssay(null);
    onEssayFormOpen();
  };

  const handleEditEssay = (essay: EssayResponse) => {
    setSelectedEssay(essay);
    onEssayFormOpen();
  };

  const handleDeleteClick = (essayId: number) => {
    setDeleteEssayId(essayId);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteEssayId) return;

    try {
      await apiDelete(`/essays/${deleteEssayId}`);
      showSuccess('Success', 'Essay deleted successfully', 3000);

      // Refresh essays list
      const essaysData = await apiGet<EssayResponse[]>(`/applications/${id}/essays`);
      setEssays(essaysData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete essay';
      showError('Error', errorMessage);
    } finally {
      setDeleteEssayId(null);
      onDeleteClose();
    }
  };

  const handleEssaySuccess = async () => {
    if (!id) return;

    // Refresh essays list after create/update
    try {
      const essaysData = await apiGet<EssayResponse[]>(`/applications/${id}/essays`);
      setEssays(essaysData || []);
    } catch (err) {
      // If no essays exist, that's okay
      setEssays([]);
    }
  };

  // Collaboration invitation handlers
  const handleSendInvite = (collaboration: CollaborationResponse) => {
    setSelectedCollaboration(collaboration);
    onInviteDialogOpen();
  };

  const handleInviteSuccess = async () => {
    if (!id) return;

    // Refresh collaborations list after sending invite
    try {
      const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
      setCollaborations(collabsData || []);

      // Fetch collaborator details for new collaborations
      if (collabsData && collabsData.length > 0) {
        const collaboratorMap = new Map(collaborators);
        for (const collab of collabsData) {
          if (!collaboratorMap.has(collab.collaboratorId)) {
            try {
              const collaboratorData = await apiGet<CollaboratorResponse>(`/collaborators/${collab.collaboratorId}`);
              collaboratorMap.set(collab.collaboratorId, collaboratorData);
            } catch (err) {
              console.error(`Failed to fetch collaborator ${collab.collaboratorId}:`, err);
            }
          }
        }
        setCollaborators(collaboratorMap);
      }
    } catch (err) {
      setCollaborations([]);
    }
  };

  // Check if resend invite button should be shown
  const shouldShowResend = (collaboration: CollaborationResponse): boolean => {
    if (collaboration.status !== 'invited' || !collaboration.invite) {
      return false;
    }

    const invite = collaboration.invite;

    // Show resend if delivery failed or bounced
    if (invite.deliveryStatus === 'bounced' || invite.deliveryStatus === 'failed') {
      return true;
    }

    // Show resend if invite was sent more than 3 days ago
    if (invite.sentAt) {
      const sentDate = new Date(invite.sentAt);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      if (sentDate < threeDaysAgo) {
        return true;
      }
    }

    return false;
  };

  // Handle viewing collaboration history
  const handleViewHistory = (collaborationId: number) => {
    setHistoryCollaborationId(collaborationId);
    onHistoryOpen();
  };

  // Handle editing collaboration
  const handleEditCollaboration = (collaboration: CollaborationResponse) => {
    setSelectedCollaborationForEdit(collaboration);
    onEditCollabOpen();
  };

  // Handle deleting collaboration
  const handleDeleteCollaborationClick = (collaborationId: number) => {
    setDeleteCollaborationId(collaborationId);
    onDeleteCollabOpen();
  };

  const handleDeleteCollaborationConfirm = async () => {
    if (!deleteCollaborationId) return;

    try {
      await apiDelete(`/collaborations/${deleteCollaborationId}`);
      showSuccess('Success', 'Collaboration deleted successfully', 3000);

      // Refresh collaborations list
      if (id) {
        const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
        setCollaborations(collabsData || []);

        // Refresh collaborator details
        const collaboratorIds = new Set(
          (collabsData || []).map((c) => c.collaboratorId)
        );
        if (collaboratorIds.size > 0) {
          const collaboratorPromises = Array.from(collaboratorIds).map((collabId) =>
            apiGet<CollaboratorResponse>(`/collaborators/${collabId}`).catch(() => null)
          );
          const collaboratorResults = await Promise.all(collaboratorPromises);
          const collaboratorMap = new Map<number, CollaboratorResponse>();
          collaboratorResults.forEach((collab) => {
            if (collab) {
              collaboratorMap.set(collab.id, collab);
            }
          });
          setCollaborators(collaboratorMap);
        } else {
          setCollaborators(new Map());
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete collaboration';
      showError('Error', errorMessage);
    } finally {
      setDeleteCollaborationId(null);
      onDeleteCollabClose();
    }
  };

  // Handle updating collaboration status
  const handleUpdateCollaborationStatus = async (collaborationId: number, status: string) => {
    try {
      // Optimistically update UI so summary counts refresh immediately
      setCollaborations((prev) =>
        prev.map((c) => {
          const idMatch = c.id === collaborationId || c.collaborationId === collaborationId;
          if (!idMatch) return c;
          return {
            ...c,
            status: status as CollaborationResponse['status'],
            awaitingActionFrom: status === 'completed' ? null : c.awaitingActionFrom,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      await apiPatch(`/collaborations/${collaborationId}`, {
        status,
        ...(status === 'completed' && { awaitingActionFrom: null })
      });

      showSuccess('Success', `Collaboration marked as ${status}`, 3000);

      // Refresh collaborations list
      if (id) {
        const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
        setCollaborations(collabsData || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update collaboration status';
      showError('Error', errorMessage);
    }
  };

  // Handle adding collaboration success
  const handleCollaborationSuccess = useCallback(async () => {
    if (!id) {
      console.warn('handleCollaborationSuccess: No application ID');
      return;
    }

    console.log('Refreshing collaborations list...');
    
    // Refresh collaborations list after adding/editing
    try {
      const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
      console.log('Fetched collaborations:', collabsData?.length || 0);
      setCollaborations(collabsData || []);

      // Update collaborator map from collaboration data (collaborator is now included in response)
      if (collabsData && collabsData.length > 0) {
        const collaboratorMap = new Map<number, CollaboratorResponse>();
        for (const collab of collabsData) {
          // Use collaborator data from the collaboration response if available
          // Type assertion needed until shared package is rebuilt with updated types
          const collabWithCollaborator = collab as CollaborationResponse & { collaborator?: CollaboratorResponse | null };
          if (collabWithCollaborator.collaborator && collabWithCollaborator.collaborator.id) {
            collaboratorMap.set(collabWithCollaborator.collaborator.id, collabWithCollaborator.collaborator);
          } else if (!collaboratorMap.has(collab.collaboratorId)) {
            // Fallback: fetch collaborator if not in response
            try {
              const collaboratorData = await apiGet<CollaboratorResponse>(`/collaborators/${collab.collaboratorId}`);
              collaboratorMap.set(collab.collaboratorId, collaboratorData);
            } catch (err) {
              console.error(`Failed to fetch collaborator ${collab.collaboratorId}:`, err);
            }
          }
        }
        setCollaborators(collaboratorMap);
        console.log('Updated collaborator map with', collaboratorMap.size, 'collaborators');
      } else {
        setCollaborators(new Map());
      }
    } catch (err) {
      console.error('Failed to refresh collaborations:', err);
      showError('Error', 'Failed to refresh collaborations list');
      // Still try to reload the page data
      try {
        const collabsData = await apiGet<CollaborationResponse[]>(`/applications/${id}/collaborations`);
        setCollaborations(collabsData || []);
      } catch (refreshErr) {
        console.error('Failed to reload collaborations:', refreshErr);
        setCollaborations([]);
      }
    }
  }, [id, showError]);

  // Keep collaboration-derived summary tiles current after closing the edit modal
  useEffect(() => {
    const wasOpen = prevIsEditCollabOpenRef.current;
    prevIsEditCollabOpenRef.current = isEditCollabOpen;

    if (wasOpen && !isEditCollabOpen) {
      void handleCollaborationSuccess();
    }
  }, [isEditCollabOpen, handleCollaborationSuccess]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
      case 'Awarded':
        return 'green';
      case 'In Progress':
        return 'blue';
      case 'Not Started':
        return 'gray';
      case 'Not Awarded':
        return 'red';
      default:
        return 'orange';
    }
  };


  const getCollaborationStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'submitted':
        return 'green';
      case 'in_progress':
        return 'blue';
      case 'pending':
      case 'invited':
        return 'orange';
      case 'declined':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatLastUpdated = (date: Date | string | undefined) => {
    if (!date) return '-';
    const updatedDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - updatedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return updatedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: updatedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading application...</Text>
        </Stack>
      </Container>
    );
  }

  if (error || !application) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Card>
          <CardBody>
            <Text color="red.500">{error || 'Application not found'}</Text>
            <Button mt="4" onClick={() => navigate('/applications')}>
              Back to Applications
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const awardAmountText = (() => {
    const min = application.minAward ?? application.maxAward;
    const max = application.maxAward ?? application.minAward ?? application.maxAward;

    if (min == null || max == null) return 'Not specified';
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  })();

  const getEssayStatus = (essay: EssayResponse) => {
    // Prefer explicit status if present (some environments may add it),
    // otherwise derive from existing fields.
    if (essay.status === 'completed') return { label: 'Completed', colorScheme: 'green' as const };
    if (essay.status === 'in_progress') return { label: 'In progress', colorScheme: 'blue' as const };
    if (essay.status === 'not_started') return { label: 'Not started', colorScheme: 'gray' as const };

    if (essay.essayLink) return { label: 'Linked', colorScheme: 'green' as const };
    if (essay.wordCount && essay.wordCount > 0) return { label: 'Draft', colorScheme: 'yellow' as const };
    return { label: 'Needs link', colorScheme: 'gray' as const };
  };

  // Progress counts
  // Essays: treat "complete" as status === completed when present, otherwise having a document link
  const essaysCompleteCount = essays.filter((e) => e.status === 'completed' || Boolean(e.essayLink)).length;
  const essaysTotalCount = essays.length;
  // const hasIncompleteEssays = essaysTotalCount > 0 && essaysCompleteCount < essaysTotalCount;
  const essaysUncompletedCount = Math.max(essaysTotalCount - essaysCompleteCount, 0);

  // Recommendations: treat "complete" as collaboration status === 'completed'
  const recommendationCollabs = collaborations.filter((c) => c.collaborationType === 'recommendation');
  const recommendationsCompleteCount = recommendationCollabs.filter((c) => c.status === 'completed').length;
  const recommendationsTotalCount = recommendationCollabs.length;
  // const hasIncompleteRecommendations =
  //   recommendationsTotalCount > 0 && recommendationsCompleteCount < recommendationsTotalCount;
  const recommendationsUncompletedCount = Math.max(recommendationsTotalCount - recommendationsCompleteCount, 0);

  // Essay Reviews: collaborations of type essayReview
  const essayReviewCollabs = collaborations.filter((c) => c.collaborationType === 'essayReview');
  const essayReviewsCompleteCount = essayReviewCollabs.filter((c) => c.status === 'completed').length;
  const essayReviewsTotalCount = essayReviewCollabs.length;
  const essayReviewsUncompletedCount = Math.max(essayReviewsTotalCount - essayReviewsCompleteCount, 0);

  return (
    <Box
      bgGradient="linear(to-b, gray.50, white)"
      minH="100vh"
      py={{ base: '4', md: '12' }}
    >
      <Container as="main" maxW="7xl" px={{ base: '4', md: '6' }}>
        <Stack spacing={{ base: '4', md: '6' }}>
        {/* Skip link for keyboard users */}
        <ChakraLink
          href="#main-content"
          position="absolute"
          left="4"
          top="2"
          px="3"
          py="2"
          bg="white"
          borderRadius="md"
          boxShadow="md"
          transform="translateY(-200%)"
          _focusVisible={{ transform: 'translateY(0)' }}
          zIndex={1000}
        >
          Skip to content
        </ChakraLink>

        <Box id="main-content" tabIndex={-1} />

        {/* Hero summary */}
        <Card
          variant="outline"
          borderRadius="2xl"
          overflow="hidden"
          bg="white"
          borderColor="blackAlpha.100"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.08)"
        >
          <Box
            px={{ base: 4, md: 6 }}
            pt={{ base: 4, md: 6 }}
            pb="4"
            bgGradient="linear(to-r, brand.50, white)"
            borderBottomWidth="1px"
            borderColor="blackAlpha.100"
          >
            <Stack spacing="4">
              <Stack
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', md: 'flex-start' }}
                spacing="4"
              >
                <Box flex="1" minW="0">
                  <Stack spacing="1">
                    <Heading size={{ base: 'md', md: 'lg' }} noOfLines={2}>
                      {application.scholarshipName}
                    </Heading>
                    {application.organization && (
                      <Text color="gray.700" fontSize={{ base: 'sm', md: 'md' }} fontWeight="medium">
                        by {application.organization}
                      </Text>
                    )}
                  </Stack>

                  <HStack spacing="2" flexWrap="wrap" mt="2">
                    <Badge
                      colorScheme={getStatusColor(application.status)}
                      fontSize={{ base: 'sm', md: 'md' }}
                      px="2.5"
                      py="1"
                      borderRadius="full"
                      textTransform="none"
                    >
                      {application.status}
                    </Badge>
                    {application.targetType && (
                      <Badge
                        colorScheme="purple"
                        fontSize={{ base: 'sm', md: 'md' }}
                        px="2.5"
                        py="1"
                        borderRadius="full"
                        textTransform="none"
                      >
                        {application.targetType}
                      </Badge>
                    )}
                    {application.platform && (
                      <Badge
                        variant="subtle"
                        colorScheme="gray"
                        fontSize={{ base: 'sm', md: 'md' }}
                        px="2.5"
                        py="1"
                        borderRadius="full"
                        textTransform="none"
                      >
                        {application.platform}
                      </Badge>
                    )}
                  </HStack>
                </Box>

                <Stack
                  direction={{ base: 'column', sm: 'row' }}
                  spacing={{ base: 3, sm: 4 }}
                  justify={{ base: 'stretch', md: 'flex-end' }}
                  align={{ base: 'stretch', sm: 'center' }}
                  flexWrap="wrap"
                >
                  {/* External links (primary actions) */}
                  <Stack
                    direction={{ base: 'column', sm: 'row' }}
                    spacing="3"
                    align={{ base: 'stretch', sm: 'center' }}
                  >
                    {application.applicationLink && (
                      <Button
                        as={ChakraLink}
                        href={application.applicationLink}
                        isExternal
                        colorScheme="green"
                        size={{ base: 'md', md: 'md' }}
                        leftIcon={<Text aria-hidden>↗</Text>}
                        boxShadow="sm"
                      >
                        Open Application Portal
                      </Button>
                    )}
                    {application.orgWebsite && (
                      <Button
                        as={ChakraLink}
                        href={application.orgWebsite}
                        isExternal
                        variant="outline"
                        colorScheme="blue"
                        size={{ base: 'md', md: 'md' }}
                        leftIcon={<Text aria-hidden>↗</Text>}
                      >
                        Visit Organization Website
                      </Button>
                    )}
                  </Stack>

                  {/* Visual separator so links don't feel grouped with page actions */}
                  {(application.applicationLink || application.orgWebsite) && (
                    <Divider
                      orientation="vertical"
                      h="10"
                      borderColor="blackAlpha.200"
                      display={{ base: 'none', sm: 'block' }}
                    />
                  )}

                  {/* Page actions */}
                  <HStack spacing="2" justify={{ base: 'stretch', sm: 'flex-end' }}>
                    <Button
                      variant="outline"
                      colorScheme="brand"
                      onClick={() => navigate(`/applications/${id}/edit`)}
                      size={{ base: 'md', md: 'md' }}
                      leftIcon={<Text aria-hidden>✎</Text>}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      colorScheme="brand"
                      onClick={() => navigate('/applications')}
                      size={{ base: 'md', md: 'md' }}
                      leftIcon={<Text aria-hidden>←</Text>}
                    >
                      Back
                    </Button>
                  </HStack>
                </Stack>
              </Stack>

              <SimpleGrid as="dl" columns={{ base: 1, sm: 3 }} spacing="3">
                <Box
                  p="3.5"
                  borderRadius="xl"
                  bg="white"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                >
                  <Text as="dt" fontSize="sm" color="gray.700">
                    Due date
                  </Text>
                  <Text as="dd" fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold">
                    {application.dueDate ? formatDateNoTimezone(application.dueDate) : 'Not specified'}
                  </Text>
                </Box>
                <Box
                  p="3.5"
                  borderRadius="xl"
                  bg="white"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                >
                  <Text as="dt" fontSize="sm" color="gray.700">
                    Submission date
                  </Text>
                  <Text as="dd" fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold">
                    {application.submissionDate ? formatDateNoTimezone(application.submissionDate) : '—'}
                  </Text>
                </Box>
                <Box
                  p="3.5"
                  borderRadius="xl"
                  bg="white"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                >
                  <Text as="dt" fontSize="sm" color="gray.700">
                    Award amount
                  </Text>
                  <Text as="dd" fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold">
                    {awardAmountText}
                  </Text>
                </Box>
              </SimpleGrid>

              {(recommendationsTotalCount > 0 || essayReviewsTotalCount > 0 || essaysTotalCount > 0) && (
                <Box
                  borderRadius="2xl"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                  bgGradient="linear(to-br, brand.50, white)"
                  boxShadow="0 8px 20px rgba(15, 23, 42, 0.06)"
                  p={{ base: 4, md: 5 }}
                >
                  <HStack spacing="3" align="start" mb="4">
                    <Box
                      w="10"
                      h="10"
                      borderRadius="xl"
                      bg="brand.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text fontSize="lg" aria-hidden>
                        ✨
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.700" fontWeight="semibold" letterSpacing="0.2px">
                        Next steps
                      </Text>
                      <Heading size="sm" color="brand.800" mt="0.5">
                        Current action
                      </Heading>
                      <Text fontSize="sm" color="gray.600" mt="1">
                        Quick view of what’s left across recommendations, reviews, and essays.
                      </Text>
                    </Box>
                  </HStack>

                  <Stack spacing="4">
                    {/* Recommendations + Essay Reviews side-by-side */}
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                      {recommendationsTotalCount > 0 && (
                        <Box
                          bg="white"
                          borderWidth="1px"
                          borderColor="blackAlpha.100"
                          borderRadius="xl"
                          p="4"
                        >
                          <HStack justify="space-between" align="start" mb="3">
                            <HStack spacing="2">
                              <Text aria-hidden>📨</Text>
                              <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                                Recommendations
                              </Text>
                            </HStack>
                            <Badge
                              colorScheme={recommendationsUncompletedCount === 0 ? 'green' : 'orange'}
                              borderRadius="full"
                              px="2.5"
                              py="1"
                              textTransform="none"
                            >
                              {recommendationsUncompletedCount === 0 ? 'All done' : `${recommendationsUncompletedCount} left`}
                            </Badge>
                          </HStack>

                          <HStack spacing="2" align="baseline">
                            <Text fontSize="2xl" fontWeight="bold" color="gray.900">
                              {recommendationsUncompletedCount}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              / {recommendationsTotalCount} uncompleted
                            </Text>
                          </HStack>

                          <Progress
                            mt="3"
                            borderRadius="full"
                            size="sm"
                            colorScheme={recommendationsUncompletedCount === 0 ? 'green' : 'orange'}
                            value={
                              recommendationsTotalCount === 0
                                ? 0
                                : ((recommendationsTotalCount - recommendationsUncompletedCount) / recommendationsTotalCount) * 100
                            }
                          />
                        </Box>
                      )}

                      {essayReviewsTotalCount > 0 && (
                        <Box
                          bg="white"
                          borderWidth="1px"
                          borderColor="blackAlpha.100"
                          borderRadius="xl"
                          p="4"
                        >
                          <HStack justify="space-between" align="start" mb="3">
                            <HStack spacing="2">
                              <Text aria-hidden>🧑‍🏫</Text>
                              <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                                Essay Reviews
                              </Text>
                            </HStack>
                            <Badge
                              colorScheme={essayReviewsUncompletedCount === 0 ? 'green' : 'blue'}
                              borderRadius="full"
                              px="2.5"
                              py="1"
                              textTransform="none"
                            >
                              {essayReviewsUncompletedCount === 0 ? 'All done' : `${essayReviewsUncompletedCount} left`}
                            </Badge>
                          </HStack>

                          <HStack spacing="2" align="baseline">
                            <Text fontSize="2xl" fontWeight="bold" color="gray.900">
                              {essayReviewsUncompletedCount}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              / {essayReviewsTotalCount} uncompleted
                            </Text>
                          </HStack>

                          <Progress
                            mt="3"
                            borderRadius="full"
                            size="sm"
                            colorScheme={essayReviewsUncompletedCount === 0 ? 'green' : 'blue'}
                            value={
                              essayReviewsTotalCount === 0
                                ? 0
                                : ((essayReviewsTotalCount - essayReviewsUncompletedCount) / essayReviewsTotalCount) * 100
                            }
                          />
                        </Box>
                      )}
                    </SimpleGrid>

                    {/* Extra separation before essays */}
                    {essaysTotalCount > 0 && (
                      <Box
                        bg="white"
                        borderWidth="1px"
                        borderColor="blackAlpha.100"
                        borderRadius="xl"
                        p="4"
                      >
                        <HStack justify="space-between" align="start" mb="3">
                          <HStack spacing="2">
                            <Text aria-hidden>📝</Text>
                            <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                              Essays
                            </Text>
                          </HStack>
                          <Badge
                            colorScheme={essaysUncompletedCount === 0 ? 'green' : 'purple'}
                            borderRadius="full"
                            px="2.5"
                            py="1"
                            textTransform="none"
                          >
                            {essaysUncompletedCount === 0 ? 'All done' : `${essaysUncompletedCount} left`}
                          </Badge>
                        </HStack>

                        <HStack spacing="2" align="baseline">
                          <Text fontSize="2xl" fontWeight="bold" color="gray.900">
                            {essaysUncompletedCount}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            / {essaysTotalCount} uncompleted
                          </Text>
                        </HStack>

                        <Progress
                          mt="3"
                          borderRadius="full"
                          size="sm"
                          colorScheme={essaysUncompletedCount === 0 ? 'green' : 'purple'}
                          value={
                            essaysTotalCount === 0
                              ? 0
                              : ((essaysTotalCount - essaysUncompletedCount) / essaysTotalCount) * 100
                          }
                        />
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Card>

        {/* Main Content Sections */}
        <Accordion defaultIndex={[0, 1, 2]} allowMultiple>
          {/* Application Details */}
          <AccordionItem border="none" mb="4">
            <Card>
              <AccordionButton as={CardHeader} _hover={{ bg: 'gray.50' }}>
                <Heading size="md" flex="1" textAlign="left">Application Details</Heading>
                <AccordionIcon fontSize="2xl" color="brand.700" />
              </AccordionButton>
              <AccordionPanel as={CardBody} p="0">
                <CardBody>
            <SimpleGrid as="dl" columns={{ base: 1, md: 2 }} spacing="6">
              <Box>
                <Text as="dt" fontWeight="bold" color="brand.700" mb="1">
                  Organization
                </Text>
                <Text as="dd">{application.organization || 'Not specified'}</Text>
              </Box>

              {application.platform && (
                <Box>
                  <Text as="dt" fontWeight="bold" color="brand.700" mb="1">
                    Platform
                  </Text>
                  <Text as="dd">{application.platform}</Text>
                </Box>
              )}

              {application.theme && (
                <Box>
                  <Text as="dt" fontWeight="bold" color="brand.700" mb="1">
                    Theme/Focus
                  </Text>
                  <Text as="dd">{application.theme}</Text>
                </Box>
              )}

              {application.openDate && (
                <Box>
                  <Text as="dt" fontWeight="bold" color="brand.700" mb="1">
                    Open Date
                  </Text>
                  <Text as="dd">{formatDateNoTimezone(application.openDate)}</Text>
                </Box>
              )}
            </SimpleGrid>

            {application.requirements && (
              <>
                <Divider my="6" />
                <Box>
                  <Text fontWeight="bold" color="brand.700" mb="2">Requirements</Text>
                  <Text whiteSpace="pre-wrap">{application.requirements}</Text>
                </Box>
              </>
            )}

            {(application.renewable || application.renewableTerms) && (
              <>
                <Divider my="6" />
                <Box>
                  <Text fontWeight="bold" color="brand.700" mb="3">Renewable Information</Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" color="brand.700" mb="1">Renewable</Text>
                      <Text>{application.renewable ? 'Yes' : 'No'}</Text>
                    </Box>
                    {application.renewableTerms && (
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm" color="brand.700" mb="1">Renewal Terms</Text>
                        <Text whiteSpace="pre-wrap">{application.renewableTerms}</Text>
                      </Box>
                    )}
                  </SimpleGrid>
                </Box>
              </>
            )}

            {/* Links moved to hero summary */}
                </CardBody>
              </AccordionPanel>
            </Card>
          </AccordionItem>

          {/* Essays Section */}
          <AccordionItem border="none" mb="4">
            <Card>
              <AccordionButton as={CardHeader} _hover={{ bg: 'gray.50' }}>
                <Heading size="md" flex="1" textAlign="left">Essays ({essays.length})</Heading>
                <AccordionIcon fontSize="2xl" color="brand.700" />
              </AccordionButton>
              <AccordionPanel as={CardBody} p="0">
                <CardBody>
                  <Flex justify="flex-end" mb="4">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={handleAddEssay}
                    >
                      Add Essay
                    </Button>
                  </Flex>
            {essays.length === 0 ? (
              <Text color="gray.500">No essays added yet</Text>
            ) : (
              <>
                {/* Desktop Table View */}
                <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Theme</Th>
                        <Th>Status</Th>
                        <Th>Word Count</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {essays.map((essay) => (
                        <Tr key={essay.id}>
                          <Td>{essay.theme || 'Untitled'}</Td>
                          <Td>
                            {(() => {
                              const status = getEssayStatus(essay);
                              return <Badge colorScheme={status.colorScheme}>{status.label}</Badge>;
                            })()}
                          </Td>
                          <Td>{essay.wordCount || '-'}</Td>
                          <Td>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<Text>⋮</Text>}
                                variant="ghost"
                                size="sm"
                              />
                              <MenuList>
                                <MenuItem onClick={() => handleEditEssay(essay)}>View/Edit</MenuItem>
                                {essay.essayLink && (
                                  <MenuItem
                                    as="a"
                                    href={essay.essayLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Open Document ↗
                                  </MenuItem>
                                )}
                                <MenuItem color="red.500" onClick={() => handleDeleteClick(essay.id)}>Delete</MenuItem>
                              </MenuList>
                            </Menu>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>

                {/* Mobile Card View */}
                <Stack spacing="3" display={{ base: 'flex', md: 'none' }}>
                  {essays.map((essay) => (
                    <Card key={essay.id}>
                      <CardBody>
                        <Flex justify="space-between" align="start">
                          <Box flex="1">
                            <Text fontWeight="bold" fontSize="md" mb="1">
                              {essay.theme || 'Untitled'}
                            </Text>
                            <HStack spacing="2" mb="1">
                              {(() => {
                                const status = getEssayStatus(essay);
                                return <Badge colorScheme={status.colorScheme}>{status.label}</Badge>;
                              })()}
                              {essay.wordCount && (
                                <Text fontSize="sm" color="gray.600">
                                  {essay.wordCount} words
                                </Text>
                              )}
                            </HStack>
                            {/* word count shown in the row above */}
                          </Box>
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<Text>⋮</Text>}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem onClick={() => handleEditEssay(essay)}>View/Edit</MenuItem>
                              {essay.essayLink && (
                                <MenuItem
                                  as="a"
                                  href={essay.essayLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Open Document ↗
                                </MenuItem>
                              )}
                              <MenuItem color="red.500" onClick={() => handleDeleteClick(essay.id)}>Delete</MenuItem>
                            </MenuList>
                          </Menu>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </Stack>
              </>
            )}
                </CardBody>
              </AccordionPanel>
            </Card>
          </AccordionItem>

          {/* Collaborations Section */}
          <AccordionItem border="none" mb="4">
            <Card>
              <AccordionButton as={CardHeader} _hover={{ bg: 'gray.50' }}>
                <Heading size="md" flex="1" textAlign="left">Collaborations ({collaborations.length})</Heading>
                <AccordionIcon fontSize="2xl" color="brand.700" />
              </AccordionButton>
              <AccordionPanel as={CardBody} p="0">
                <CardBody>
                  <Flex justify="flex-end" mb="4">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={onAddCollabOpen}
                    >
                      Add Collaborator
                    </Button>
                  </Flex>
            {collaborations.length === 0 ? (
              <Text color="gray.500">No collaborations added yet. Click "Add Collaborator" to get started.</Text>
            ) : (
              <Stack spacing="6">
                {/* Recommendations Section */}
                {collaborations.filter((c) => c.collaborationType === 'recommendation').length > 0 && (
                  <Box>
                    <Heading size="sm" mb="3">
                      Recommendations ({collaborations.filter((c) => c.collaborationType === 'recommendation').length})
                    </Heading>
                    {/* Desktop Table View */}
                    <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Collaborator</Th>
                            <Th>Status</Th>
                            <Th>Due Date</Th>
                            <Th>Last Updated</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {collaborations
                            .filter((c) => c.collaborationType === 'recommendation')
                            .map((collab) => {
                              const collaborator = collaborators.get(collab.collaboratorId);
                              return (
                                <Tr key={collab.id}>
                                  <Td>
                                    {collaborator
                                      ? `${collaborator.firstName} ${collaborator.lastName}`
                                      : 'Loading...'}
                                  </Td>
                                  <Td>
                                    <Badge colorScheme={getCollaborationStatusColor(collab.status)}>
                                      {collab.status}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    {collab.nextActionDueDate
                                      ? formatDateNoTimezone(collab.nextActionDueDate)
                                      : '-'}
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm" color="gray.600">
                                      {formatLastUpdated(collab.updatedAt)}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        icon={<Text>⋮</Text>}
                                        variant="ghost"
                                        size="sm"
                                      />
                                      <MenuList>
                                        <MenuItem onClick={() => handleViewHistory(collab.id)}>
                                          View History
                                        </MenuItem>
                                        <MenuItem onClick={() => handleEditCollaboration(collab)}>
                                          Edit
                                        </MenuItem>
                                        {collab.status === 'pending' && (
                                          <MenuItem onClick={() => handleSendInvite(collab)}>
                                            Send Invite
                                          </MenuItem>
                                        )}
                                        {shouldShowResend(collab) && (
                                          <MenuItem onClick={() => handleSendInvite(collab)}>
                                            Resend Invite
                                          </MenuItem>
                                        )}
                                        {collab.status === 'submitted' && (
                                          <MenuItem color="green.500" onClick={() => handleUpdateCollaborationStatus(collab.id, 'completed')}>
                                            Mark as Completed
                                          </MenuItem>
                                        )}
                                        <MenuItem color="red.500" onClick={() => handleDeleteCollaborationClick(collab.id)}>
                                          Remove
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  </Td>
                                </Tr>
                              );
                            })}
                        </Tbody>
                      </Table>
                    </Box>
                    {/* Mobile Card View */}
                    <Stack spacing="3" display={{ base: 'flex', md: 'none' }}>
                      {collaborations
                        .filter((c) => c.collaborationType === 'recommendation')
                        .map((collab) => {
                          const collaborator = collaborators.get(collab.collaboratorId);
                          return (
                            <Card key={collab.id}>
                              <CardBody>
                                <Flex justify="space-between" align="start">
                                  <Box flex="1">
                                    <Text fontWeight="bold" fontSize="md" mb="1">
                                      {collaborator 
                                        ? `${collaborator.firstName} ${collaborator.lastName}` 
                                        : 'Loading...'}
                                    </Text>
                                    <HStack spacing="2" mb="2">
                                      <Badge colorScheme={getCollaborationStatusColor(collab.status)}>
                                        {collab.status}
                                      </Badge>
                                    </HStack>
                                    {collab.nextActionDueDate && (
                                      <Text fontSize="sm" color="gray.600">
                                        Due: {formatDateNoTimezone(collab.nextActionDueDate)}
                                      </Text>
                                    )}
                                    <Text fontSize="xs" color="gray.500">
                                      Updated: {formatLastUpdated(collab.updatedAt)}
                                    </Text>
                                  </Box>
                                  <Menu>
                                    <MenuButton
                                      as={IconButton}
                                      icon={<Text>⋮</Text>}
                                      variant="ghost"
                                      size="sm"
                                    />
                                    <MenuList>
                                      <MenuItem onClick={() => handleViewHistory(collab.id)}>
                                        View History
                                      </MenuItem>
                                      <MenuItem onClick={() => handleEditCollaboration(collab)}>
                                        Edit
                                      </MenuItem>
                                      {collab.status === 'pending' && (
                                        <MenuItem onClick={() => handleSendInvite(collab)}>
                                          Send Invite
                                        </MenuItem>
                                      )}
                                      {shouldShowResend(collab) && (
                                        <MenuItem onClick={() => handleSendInvite(collab)}>
                                          Resend Invite
                                        </MenuItem>
                                      )}
                                      <MenuItem color="red.500" onClick={() => handleDeleteCollaborationClick(collab.id)}>
                                        Remove
                                      </MenuItem>
                                    </MenuList>
                                  </Menu>
                                </Flex>
                              </CardBody>
                            </Card>
                          );
                        })}
                    </Stack>
                  </Box>
                )}

                {/* Essay Reviews Section */}
                {collaborations.filter((c) => c.collaborationType === 'essayReview').length > 0 && (
                  <Box>
                    <Heading size="sm" mb="3">
                      Essay Reviews ({collaborations.filter((c) => c.collaborationType === 'essayReview').length})
                    </Heading>
                    {/* Desktop Table View */}
                    <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Collaborator</Th>
                            <Th>Status</Th>
                            <Th>Due Date</Th>
                            <Th>Last Updated</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {collaborations
                            .filter((c) => c.collaborationType === 'essayReview')
                            .map((collab) => {
                              const collaborator = collaborators.get(collab.collaboratorId);
                              return (
                                <Tr key={collab.id}>
                                  <Td>
                                    {collaborator 
                                      ? `${collaborator.firstName} ${collaborator.lastName}` 
                                      : 'Loading...'}
                                  </Td>
                                  <Td>
                                    <Badge colorScheme={getCollaborationStatusColor(collab.status)}>
                                      {collab.status}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    {collab.nextActionDueDate
                                      ? formatDateNoTimezone(collab.nextActionDueDate)
                                      : '-'}
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm" color="gray.600">
                                      {formatLastUpdated(collab.updatedAt)}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        icon={<Text>⋮</Text>}
                                        variant="ghost"
                                        size="sm"
                                      />
                                      <MenuList>
                                        <MenuItem onClick={() => handleViewHistory(collab.id)}>
                                          View History
                                        </MenuItem>
                                        <MenuItem onClick={() => handleEditCollaboration(collab)}>
                                          Edit
                                        </MenuItem>
                                        {collab.status === 'pending' && (
                                          <MenuItem onClick={() => handleSendInvite(collab)}>
                                            Send Invite
                                          </MenuItem>
                                        )}
                                        {shouldShowResend(collab) && (
                                          <MenuItem onClick={() => handleSendInvite(collab)}>
                                            Resend Invite
                                          </MenuItem>
                                        )}
                                        {collab.status === 'submitted' && (
                                          <MenuItem color="green.500" onClick={() => handleUpdateCollaborationStatus(collab.id, 'completed')}>
                                            Mark as Completed
                                          </MenuItem>
                                        )}
                                        <MenuItem color="red.500" onClick={() => handleDeleteCollaborationClick(collab.id)}>
                                          Remove
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  </Td>
                                </Tr>
                              );
                            })}
                        </Tbody>
                      </Table>
                    </Box>
                    {/* Mobile Card View */}
                    <Stack spacing="3" display={{ base: 'flex', md: 'none' }}>
                      {collaborations
                        .filter((c) => c.collaborationType === 'essayReview')
                        .map((collab) => {
                          const collaborator = collaborators.get(collab.collaboratorId);
                          return (
                            <Card key={collab.id}>
                              <CardBody>
                                <Flex justify="space-between" align="start">
                                  <Box flex="1">
                                    <Text fontWeight="bold" fontSize="md" mb="1">
                                      {collaborator 
                                        ? `${collaborator.firstName} ${collaborator.lastName}` 
                                        : 'Loading...'}
                                    </Text>
                                    <HStack spacing="2" mb="2">
                                      <Badge colorScheme={getCollaborationStatusColor(collab.status)}>
                                        {collab.status}
                                      </Badge>
                                    </HStack>
                                    {collab.nextActionDueDate && (
                                      <Text fontSize="sm" color="gray.600">
                                        Due: {formatDateNoTimezone(collab.nextActionDueDate)}
                                      </Text>
                                    )}
                                    <Text fontSize="xs" color="gray.500">
                                      Updated: {formatLastUpdated(collab.updatedAt)}
                                    </Text>
                                  </Box>
                                  <Menu>
                                    <MenuButton
                                      as={IconButton}
                                      icon={<Text>⋮</Text>}
                                      variant="ghost"
                                      size="sm"
                                    />
                                    <MenuList>
                                      <MenuItem onClick={() => handleViewHistory(collab.id)}>
                                        View History
                                      </MenuItem>
                                      <MenuItem onClick={() => handleEditCollaboration(collab)}>
                                        Edit
                                      </MenuItem>
                                      {collab.status === 'pending' && (
                                        <MenuItem onClick={() => handleSendInvite(collab)}>
                                          Send Invite
                                        </MenuItem>
                                      )}
                                      {shouldShowResend(collab) && (
                                        <MenuItem onClick={() => handleSendInvite(collab)}>
                                          Resend Invite
                                        </MenuItem>
                                      )}
                                      <MenuItem color="red.500" onClick={() => handleDeleteCollaborationClick(collab.id)}>
                                        Remove
                                      </MenuItem>
                                    </MenuList>
                                  </Menu>
                                </Flex>
                              </CardBody>
                            </Card>
                          );
                        })}
                    </Stack>
                  </Box>
                )}

                {/* Guidance Section */}
                {collaborations.filter((c) => c.collaborationType === 'guidance').length > 0 && (
                  <Box>
                    <Heading size="sm" mb="3">
                      Guidance & Counseling ({collaborations.filter((c) => c.collaborationType === 'guidance').length})
                    </Heading>
                    {/* Desktop Table View */}
                    <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Collaborator</Th>
                            <Th>Status</Th>
                            <Th>Due Date</Th>
                            <Th>Last Updated</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {collaborations
                            .filter((c) => c.collaborationType === 'guidance')
                            .map((collab) => {
                              const collaborator = collaborators.get(collab.collaboratorId);
                              return (
                                <Tr key={collab.id}>
                                  <Td>
                                    {collaborator
                                      ? `${collaborator.firstName} ${collaborator.lastName}`
                                      : 'Loading...'}
                                  </Td>
                                  <Td>
                                    <Badge colorScheme={getCollaborationStatusColor(collab.status)}>
                                      {collab.status}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    {collab.nextActionDueDate
                                      ? formatDateNoTimezone(collab.nextActionDueDate)
                                      : '-'}
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm" color="gray.600">
                                      {formatLastUpdated(collab.updatedAt)}
                                    </Text>
                                  </Td>
                                  <Td>
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        icon={<Text>⋮</Text>}
                                        variant="ghost"
                                        size="sm"
                                      />
                                      <MenuList>
                                        <MenuItem onClick={() => handleViewHistory(collab.id)}>
                                          View History
                                        </MenuItem>
                                        <MenuItem onClick={() => handleEditCollaboration(collab)}>
                                          Edit
                                        </MenuItem>
                                        {collab.status === 'pending' && (
                                          <MenuItem onClick={() => handleSendInvite(collab)}>
                                            Send Invite
                                          </MenuItem>
                                        )}
                                        {shouldShowResend(collab) && (
                                          <MenuItem onClick={() => handleSendInvite(collab)}>
                                            Resend Invite
                                          </MenuItem>
                                        )}
                                        {collab.status === 'submitted' && (
                                          <MenuItem color="green.500" onClick={() => handleUpdateCollaborationStatus(collab.id, 'completed')}>
                                            Mark as Completed
                                          </MenuItem>
                                        )}
                                        <MenuItem color="red.500" onClick={() => handleDeleteCollaborationClick(collab.id)}>
                                          Remove
                                        </MenuItem>
                                      </MenuList>
                                    </Menu>
                                  </Td>
                                </Tr>
                              );
                            })}
                        </Tbody>
                      </Table>
                    </Box>
                    {/* Mobile Card View */}
                    <Stack spacing="3" display={{ base: 'flex', md: 'none' }}>
                      {collaborations
                        .filter((c) => c.collaborationType === 'guidance')
                        .map((collab) => {
                          const collaborator = collaborators.get(collab.collaboratorId);
                          return (
                            <Card key={collab.id}>
                              <CardBody>
                                <Flex justify="space-between" align="start">
                                  <Box flex="1">
                                    <Text fontWeight="bold" fontSize="md" mb="1">
                                      {collaborator 
                                        ? `${collaborator.firstName} ${collaborator.lastName}` 
                                        : 'Loading...'}
                                    </Text>
                                    <HStack spacing="2" mb="2">
                                      <Badge colorScheme={getCollaborationStatusColor(collab.status)}>
                                        {collab.status}
                                      </Badge>
                                    </HStack>
                                    {collab.nextActionDueDate && (
                                      <Text fontSize="sm" color="gray.600">
                                        Due: {formatDateNoTimezone(collab.nextActionDueDate)}
                                      </Text>
                                    )}
                                    <Text fontSize="xs" color="gray.500">
                                      Updated: {formatLastUpdated(collab.updatedAt)}
                                    </Text>
                                  </Box>
                                  <Menu>
                                    <MenuButton
                                      as={IconButton}
                                      icon={<Text>⋮</Text>}
                                      variant="ghost"
                                      size="sm"
                                    />
                                    <MenuList>
                                      <MenuItem onClick={() => handleViewHistory(collab.id)}>
                                        View History
                                      </MenuItem>
                                      <MenuItem onClick={() => handleEditCollaboration(collab)}>
                                        Edit
                                      </MenuItem>
                                      {collab.status === 'pending' && (
                                        <MenuItem onClick={() => handleSendInvite(collab)}>
                                          Send Invite
                                        </MenuItem>
                                      )}
                                      {shouldShowResend(collab) && (
                                        <MenuItem onClick={() => handleSendInvite(collab)}>
                                          Resend Invite
                                        </MenuItem>
                                      )}
                                      <MenuItem color="red.500" onClick={() => handleDeleteCollaborationClick(collab.id)}>
                                        Remove
                                      </MenuItem>
                                    </MenuList>
                                  </Menu>
                                </Flex>
                              </CardBody>
                            </Card>
                          );
                        })}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
                </CardBody>
              </AccordionPanel>
            </Card>
          </AccordionItem>
        </Accordion>

        {/* Sticky mobile primary action */}
        {application.applicationLink && (
          <Box
            display={{ base: 'block', md: 'none' }}
            position="sticky"
            bottom="0"
            pt="3"
            pb="calc(env(safe-area-inset-bottom, 0px) + 12px)"
            bg="whiteAlpha.900"
            backdropFilter="blur(10px)"
            borderTopWidth="1px"
            borderColor="blackAlpha.100"
            zIndex={10}
          >
            <Button
              as={ChakraLink}
              href={application.applicationLink}
              isExternal
              colorScheme="green"
              size="lg"
              width="100%"
              leftIcon={<Text aria-hidden>↗</Text>}
              boxShadow="sm"
            >
              Open Application Portal
            </Button>
          </Box>
        )}
        </Stack>

      {/* Essay Form Modal */}
      <EssayForm
        isOpen={isEssayFormOpen}
        onClose={onEssayFormClose}
        applicationId={parseInt(id!)}
        essay={selectedEssay}
        onSuccess={handleEssaySuccess}
      />

      {/* Delete Essay Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Essay
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this essay? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Send Invite Dialog */}
      <SendInviteDialog
        isOpen={isInviteDialogOpen}
        onClose={onInviteDialogClose}
        collaboration={selectedCollaboration}
        collaboratorName={
          selectedCollaboration && collaborators.has(selectedCollaboration.collaboratorId)
            ? `${collaborators.get(selectedCollaboration.collaboratorId)!.firstName} ${collaborators.get(selectedCollaboration.collaboratorId)!.lastName}`
            : undefined
        }
        applicationName={application?.scholarshipName}
        onSuccess={handleInviteSuccess}
      />

      {/* Collaboration History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={onHistoryClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Collaboration History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {historyCollaborationId && (
              <CollaborationHistory collaborationId={historyCollaborationId} isOpen={isHistoryOpen} />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Add Collaboration Modal */}
      <AddCollaborationModal
        isOpen={isAddCollabOpen}
        onClose={onAddCollabClose}
        applicationId={parseInt(id!)}
        essays={essays}
        onSuccess={handleCollaborationSuccess}
      />

      {/* Edit Collaboration Modal */}
      <EditCollaborationModal
        isOpen={isEditCollabOpen}
        onClose={onEditCollabClose}
        collaboration={selectedCollaborationForEdit}
        onSuccess={handleCollaborationSuccess}
      />

      {/* Delete Collaboration Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteCollabOpen}
        leastDestructiveRef={cancelCollabRef}
        onClose={onDeleteCollabClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Collaboration
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this collaboration? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelCollabRef} onClick={onDeleteCollabClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteCollaborationConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      </Container>
    </Box>
  );
}

export default ApplicationDetail;
