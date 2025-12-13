/**
 * CollaboratorDashboard Page
 * Shows all collaborations assigned to the logged-in user as a collaborator
 */

import { useEffect, useState } from 'react';
import {
  Container,
  Heading,
  Stack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  Button,
  Spinner,
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Card,
  CardBody,
  Flex,
  HStack
} from '@chakra-ui/react';
import { useCollaborations } from '../hooks/useCollaborations';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import CollaborationHistory from '../components/CollaborationHistory';
import { apiPatch } from '../services/api';
import { formatDateNoTimezone } from '../utils/date';
import { useToastHelpers } from '../utils/toast';

function CollaboratorDashboard() {
  const { collaborations, loading, fetchCollaborations } = useCollaborations();
  const { showSuccess, showError } = useToastHelpers();

  // History modal state
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  const [historyCollaborationId, setHistoryCollaborationId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);

  useEffect(() => {
    fetchCollaborations();
  }, [fetchCollaborations]);

  // Handle marking collaboration as submitted
  const handleMarkAsSubmitted = async (collaborationId: number) => {
    try {
      setSubmitting(collaborationId);
      await apiPatch(`/collaborations/${collaborationId}`, {
        status: 'submitted',
        awaitingActionFrom: 'student',
        nextActionDescription: 'Review submitted work'
      });

      showSuccess('Success', 'Marked as submitted. The student will be notified.', 3000, true);

      // Refresh collaborations
      await fetchCollaborations();
    } catch (error) {
      showError('Error', 'Failed to update collaboration status', 5000, true);
      console.error(error);
    } finally {
      setSubmitting(null);
    }
  };

  // Group collaborations by type
  const recommendations = collaborations.filter(c => c.collaborationType === 'recommendation');
  const essayReviews = collaborations.filter(c => c.collaborationType === 'essayReview');
  const guidance = collaborations.filter(c => c.collaborationType === 'guidance');

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'not_invited':
        return 'Not Invited';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Handle viewing collaboration history
  const handleViewHistory = (collaborationId: number) => {
    setHistoryCollaborationId(collaborationId);
    onHistoryOpen();
  };

  const renderCollaborationsTable = (collaborationsList: CollaborationResponse[]) => {
    if (collaborationsList.length === 0) {
      return <Text color="gray.500">No collaborations in this category</Text>;
    }

    return (
      <>
        {/* Desktop Table View */}
        <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th>Application</Th>
                <Th>Status</Th>
                <Th>Due Date</Th>
                <Th>Last Updated</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {collaborationsList.map((collab) => (
                <Tr key={collab.id}>
                  <Td fontWeight="semibold">
                    {/* Student name would come from user profile */}
                    Student #{collab.userId}
                  </Td>
                  <Td>
                    {/* Application name would come from joined data */}
                    Application #{collab.applicationId}
                        {/* essayReview collaborations no longer link to a specific essay */}
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(collab.status)}>
                      {getStatusLabel(collab.status)}
                    </Badge>
                  </Td>
                  <Td>
                    {collab.nextActionDueDate ? (
                      formatDateNoTimezone(collab.nextActionDueDate)
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>
                    <Text fontSize="sm" color="gray.600">
                      {formatLastUpdated(collab.updatedAt)}
                    </Text>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant="outline"
                        onClick={() => handleViewHistory(collab.id)}
                      >
                        View History
                      </Button>
                      {collab.status === 'in_progress' && (
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={() => handleMarkAsSubmitted(collab.id)}
                          isLoading={submitting === collab.id}
                        >
                          Mark as Submitted
                        </Button>
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Mobile Card View */}
        <Stack spacing="3" display={{ base: 'flex', md: 'none' }}>
          {collaborationsList.map((collab) => (
            <Card key={collab.id}>
              <CardBody>
                <Stack spacing="3">
                  <Flex justify="space-between" align="start">
                    <Box flex="1">
                      <Text fontWeight="bold" fontSize="md" mb="1">
                        Student #{collab.userId}
                      </Text>
                      <Text fontSize="sm" color="gray.600" mb="2">
                        Application #{collab.applicationId}
                        {/* essayReview collaborations no longer link to a specific essay */}
                      </Text>
                    </Box>
                    <Badge colorScheme={getStatusColor(collab.status)}>
                      {getStatusLabel(collab.status)}
                    </Badge>
                  </Flex>
                  {collab.nextActionDueDate && (
                    <Text fontSize="sm" color="gray.600">
                      Due: {formatDateNoTimezone(collab.nextActionDueDate)}
                    </Text>
                  )}
                  <Text fontSize="xs" color="gray.500">
                    Updated: {formatLastUpdated(collab.updatedAt)}
                  </Text>
                  <Stack spacing={2} width="100%">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => handleViewHistory(collab.id)}
                      width="100%"
                    >
                      View History
                    </Button>
                    {collab.status === 'in_progress' && (
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => handleMarkAsSubmitted(collab.id)}
                        isLoading={submitting === collab.id}
                        width="100%"
                      >
                        Mark as Submitted
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>
      </>
    );
  };

  if (loading) {
    return (
      <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading collaborations...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
      <Stack spacing={{ base: '4', md: '6' }}>
        {/* Header */}
        <Box>
          <Heading size={{ base: 'md', md: 'lg' }} mb="2">My Collaborations</Heading>
          <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
            Manage your recommendations, essay reviews, and guidance sessions
          </Text>
        </Box>

        {/* Tabs for different collaboration types */}
        <Tabs colorScheme="blue">
          <Box overflowX="auto" overflowY="hidden">
            <TabList display="flex" minW="max-content" flexWrap={{ base: 'nowrap', md: 'wrap' }}>
              <Tab whiteSpace="nowrap">All ({collaborations.length})</Tab>
              <Tab whiteSpace="nowrap">Recommendations ({recommendations.length})</Tab>
              <Tab whiteSpace="nowrap">Essay Reviews ({essayReviews.length})</Tab>
              <Tab whiteSpace="nowrap">Guidance ({guidance.length})</Tab>
            </TabList>
          </Box>

          <TabPanels>
            <TabPanel px={0}>
              {renderCollaborationsTable(collaborations)}
            </TabPanel>
            <TabPanel px={0}>
              {renderCollaborationsTable(recommendations)}
            </TabPanel>
            <TabPanel px={0}>
              {renderCollaborationsTable(essayReviews)}
            </TabPanel>
            <TabPanel px={0}>
              {renderCollaborationsTable(guidance)}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>

      {/* Collaboration History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={onHistoryClose} size={{ base: 'full', md: 'lg' }} isCentered>
        <ModalOverlay />
        <ModalContent mx={{ base: 0, md: 'auto' }} my={{ base: 0, md: 'auto' }} maxH={{ base: '100vh', md: '90vh' }} overflowY="auto">
          <ModalHeader>Collaboration History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {historyCollaborationId && (
              <CollaborationHistory collaborationId={historyCollaborationId} isOpen={isHistoryOpen} />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default CollaboratorDashboard;
