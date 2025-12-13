/**
 * CollaboratorDashboard Page
 * Shows all collaborations assigned to the logged-in user as a collaborator
 */

import { useState } from 'react';
import {
  Container,
  Heading,
  Stack,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  Text,
  Badge,
  Button,
  Spinner,
  Box,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  useDisclosure,
  CardRoot,
  CardBody,
  Flex,
  HStack
} from '@chakra-ui/react';
import { useCollaboratorCollaborations } from '../hooks/useCollaborations';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import CollaborationHistory from '../components/CollaborationHistory';
import { apiPatch } from '../services/api';
import { formatDateNoTimezone, formatRelativeTimestamp } from '../utils/date';
import { useToastHelpers } from '../utils/toast';

function CollaboratorDashboard() {
  const { data: collaborations = [], isLoading: loading, refetch } = useCollaboratorCollaborations();
  const { showSuccess, showError } = useToastHelpers();

  // History modal state
  const {
    open: isHistoryOpen,
    onOpen: onHistoryOpen,
    setOpen: setHistoryOpen,
  } = useDisclosure();
  const [historyCollaborationId, setHistoryCollaborationId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recommendations' | 'essayReviews' | 'guidance'>('all');

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
      await refetch();
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

  const formatLastUpdated = (date: Date | string | undefined) => formatRelativeTimestamp(date, '-');

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
          <TableRoot>
            <TableHeader>
              <TableRow>
                <TableColumnHeader>Student</TableColumnHeader>
                <TableColumnHeader>Application</TableColumnHeader>
                <TableColumnHeader>Status</TableColumnHeader>
                <TableColumnHeader>Due Date</TableColumnHeader>
                <TableColumnHeader>Last Updated</TableColumnHeader>
                <TableColumnHeader>Actions</TableColumnHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborationsList.map((collab) => (
                <TableRow key={collab.id}>
                  <TableCell fontWeight="semibold">
                    {/* Student name would come from user profile */}
                    Student #{collab.userId}
                  </TableCell>
                  <TableCell>
                    {/* Application name would come from joined data */}
                    Application #{collab.applicationId}
                        {/* essayReview collaborations no longer link to a specific essay */}
                  </TableCell>
                  <TableCell>
                    <Badge colorPalette={getStatusColor(collab.status)}>
                      {getStatusLabel(collab.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {collab.nextActionDueDate ? (
                      formatDateNoTimezone(collab.nextActionDueDate)
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Text fontSize="sm" color="gray.600">
                      {formatLastUpdated(collab.updatedAt)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        colorPalette="blue"
                        variant="outline"
                        onClick={() => handleViewHistory(collab.id)}
                      >
                        View History
                      </Button>
                      {collab.status === 'in_progress' && (
                        <Button
                          size="sm"
                          colorPalette="green"
                          onClick={() => handleMarkAsSubmitted(collab.id)}
                          loading={submitting === collab.id}
                        >
                          Mark as Submitted
                        </Button>
                      )}
                    </HStack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        </Box>

        {/* Mobile Card View */}
        <Stack gap="3" display={{ base: 'flex', md: 'none' }}>
          {collaborationsList.map((collab) => (
            <CardRoot key={collab.id}>
              <CardBody>
                <Stack gap="3">
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
                    <Badge colorPalette={getStatusColor(collab.status)}>
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
                  <Stack gap={2} width="100%">
                    <Button
                      size="sm"
                      colorPalette="blue"
                      variant="outline"
                      onClick={() => handleViewHistory(collab.id)}
                      width="100%"
                    >
                      View History
                    </Button>
                    {collab.status === 'in_progress' && (
                      <Button
                        size="sm"
                        colorPalette="green"
                        onClick={() => handleMarkAsSubmitted(collab.id)}
                        loading={submitting === collab.id}
                        width="100%"
                      >
                        Mark as Submitted
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardBody>
            </CardRoot>
          ))}
        </Stack>
      </>
    );
  };

  if (loading) {
    return (
      <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
        <Stack gap="8" align="center">
          <Spinner size="xl" />
          <Text>Loading collaborations...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
      <Stack gap={{ base: '4', md: '6' }}>
        {/* Header */}
        <Box>
          <Heading size={{ base: 'md', md: 'lg' }} mb="2">My Collaborations</Heading>
          <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
            Manage your recommendations, essay reviews, and guidance sessions
          </Text>
        </Box>

        {/* Tabs for different collaboration types */}
        <TabsRoot value={activeTab} onValueChange={(details) => setActiveTab(details.value as typeof activeTab)}>
          <Box overflowX="auto" overflowY="hidden">
            <TabsList display="flex" minW="max-content" flexWrap={{ base: 'nowrap', md: 'wrap' }}>
              <TabsTrigger value="all" whiteSpace="nowrap">
                All ({collaborations.length})
              </TabsTrigger>
              <TabsTrigger value="recommendations" whiteSpace="nowrap">
                Recommendations ({recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="essayReviews" whiteSpace="nowrap">
                Essay Reviews ({essayReviews.length})
              </TabsTrigger>
              <TabsTrigger value="guidance" whiteSpace="nowrap">
                Guidance ({guidance.length})
              </TabsTrigger>
            </TabsList>
          </Box>

          <TabsContent value="all" px={0}>
            {renderCollaborationsTable(collaborations)}
          </TabsContent>
          <TabsContent value="recommendations" px={0}>
            {renderCollaborationsTable(recommendations)}
          </TabsContent>
          <TabsContent value="essayReviews" px={0}>
            {renderCollaborationsTable(essayReviews)}
          </TabsContent>
          <TabsContent value="guidance" px={0}>
            {renderCollaborationsTable(guidance)}
          </TabsContent>
        </TabsRoot>
      </Stack>

      {/* Collaboration History Modal */}
      <DialogRoot open={isHistoryOpen} onOpenChange={(details) => setHistoryOpen(details.open)}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent
            mx={{ base: 0, md: 'auto' }}
            my={{ base: 0, md: 'auto' }}
            maxH={{ base: '100vh', md: '90vh' }}
            overflowY="auto"
            w={{ base: '100vw', md: 'auto' }}
            maxW={{ base: '100vw', md: 'lg' }}
          >
          <DialogHeader>Collaboration History</DialogHeader>
          <DialogCloseTrigger />
          <DialogBody pb={6}>
            {historyCollaborationId && (
              <CollaborationHistory collaborationId={historyCollaborationId} isOpen={isHistoryOpen} />
            )}
          </DialogBody>
        </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Container>
  );
}

export default CollaboratorDashboard;
