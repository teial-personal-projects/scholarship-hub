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
} from '@chakra-ui/react';
import { apiGet } from '../services/api';
import type { CollaborationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function CollaboratorDashboard() {
  const { showError } = useToastHelpers();
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborations();
  }, []);

  const fetchCollaborations = async () => {
    try {
      setLoading(true);
      // Endpoint would be GET /api/collaborators/me/collaborations
      // This needs to be implemented in the backend
      const data = await apiGet<CollaborationResponse[]>('/collaborators/me/collaborations');
      setCollaborations(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load collaborations';
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
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

  const renderCollaborationsTable = (collaborationsList: CollaborationResponse[]) => {
    if (collaborationsList.length === 0) {
      return <Text color="gray.500">No collaborations in this category</Text>;
    }

    return (
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Student</Th>
            <Th>Application</Th>
            <Th>Status</Th>
            <Th>Due Date</Th>
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
                {collab.essayId && (
                  <Text fontSize="sm" color="gray.500">
                    Essay #{collab.essayId}
                  </Text>
                )}
              </Td>
              <Td>
                <Badge colorScheme={getStatusColor(collab.status)}>
                  {getStatusLabel(collab.status)}
                </Badge>
              </Td>
              <Td>
                {collab.nextActionDueDate ? (
                  new Date(collab.nextActionDueDate).toLocaleDateString()
                ) : (
                  <Text color="gray.400">-</Text>
                )}
              </Td>
              <Td>
                <Button size="sm" colorScheme="blue" variant="outline">
                  View Details
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  };

  if (loading) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading collaborations...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={{ base: '8', md: '12' }}>
      <Stack spacing="6">
        {/* Header */}
        <Box>
          <Heading size="lg" mb="2">My Collaborations</Heading>
          <Text color="gray.600">
            Manage your recommendations, essay reviews, and guidance sessions
          </Text>
        </Box>

        {/* Tabs for different collaboration types */}
        <Tabs colorScheme="blue">
          <TabList>
            <Tab>All ({collaborations.length})</Tab>
            <Tab>Recommendations ({recommendations.length})</Tab>
            <Tab>Essay Reviews ({essayReviews.length})</Tab>
            <Tab>Guidance ({guidance.length})</Tab>
          </TabList>

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
    </Container>
  );
}

export default CollaboratorDashboard;
