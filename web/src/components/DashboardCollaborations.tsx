import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Stack,
  Badge,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Link,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import type { ApplicationResponse, CollaborationResponse, CollaborationResponseWithSnakeCase, CollaboratorResponse, EssayResponse } from '@scholarship-hub/shared';

// Helper function to format dates without timezone conversion
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  return `${month}/${day}/${year}`;
};

function DashboardCollaborations() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorResponse>>(new Map());
  const [allEssays, setAllEssays] = useState<EssayResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all applications
        const applicationsData = await apiGet<ApplicationResponse[]>('/applications');
        setApplications(applicationsData || []);

        // Fetch collaborations and essays for each application
        const allCollaborations: CollaborationResponse[] = [];
        const allEssaysData: EssayResponse[] = [];
        const collaboratorIds = new Set<number>();

        for (const app of applicationsData || []) {
          try {
            const collabs = await apiGet<CollaborationResponse[]>(`/applications/${app.id}/collaborations`);
            if (collabs) {
              allCollaborations.push(...collabs);
              // Collect collaborator IDs
              collabs.forEach(collab => {
                collaboratorIds.add(collab.collaboratorId);
                // Check if collaborator data is embedded in response
                const collabWithEmbedded = collab as CollaborationResponse & { collaborator?: CollaboratorResponse };
                if (collabWithEmbedded.collaborator && collabWithEmbedded.collaborator.id) {
                  collaboratorIds.delete(collabWithEmbedded.collaborator.id); // Will add from embedded data
                }
              });
            }
          } catch (err) {
            // Continue if one application's collaborations fail to load
            console.error(`Failed to load collaborations for application ${app.id}:`, err);
          }

          // Fetch essays for this application
          try {
            const essays = await apiGet<EssayResponse[]>(`/applications/${app.id}/essays`);
            if (essays) {
              allEssaysData.push(...essays);
            }
          } catch (err) {
            // Continue if one application's essays fail to load
            console.error(`Failed to load essays for application ${app.id}:`, err);
          }
        }
        setCollaborations(allCollaborations);
        setAllEssays(allEssaysData);
        
        // Debug: Check what collaboration types we have
        if (allCollaborations.length > 0) {
          console.log('Fetched collaborations:', allCollaborations.map(c => {
            const typedCollab = c as CollaborationResponseWithSnakeCase;
            return {
              id: c.id,
              collaborationType: c.collaborationType,
              rawType: typedCollab.collaboration_type,
            };
          }));
        }

        // Fetch collaborator details
        const collaboratorMap = new Map<number, CollaboratorResponse>();
        
        // First, check for embedded collaborator data in collaboration responses
        allCollaborations.forEach(collab => {
          const collabWithEmbedded = collab as CollaborationResponse & { collaborator?: CollaboratorResponse };
          if (collabWithEmbedded.collaborator && collabWithEmbedded.collaborator.id) {
            collaboratorMap.set(collabWithEmbedded.collaborator.id, collabWithEmbedded.collaborator);
          }
        });

        // Then fetch any missing collaborators
        for (const collabId of collaboratorIds) {
          if (!collaboratorMap.has(collabId)) {
            try {
              const collaboratorData = await apiGet<CollaboratorResponse>(`/collaborators/${collabId}`);
              collaboratorMap.set(collabId, collaboratorData);
            } catch (err) {
              console.error(`Failed to fetch collaborator ${collabId}:`, err);
            }
          }
        }
        setCollaborators(collaboratorMap);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load collaborations';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter collaborations by type
  const recommendations = useMemo(() => {
    const filtered = collaborations.filter(c => {
      // Check both camelCase and snake_case field names (defensive)
      const typedCollab = c as CollaborationResponseWithSnakeCase;
      const type = typedCollab.collaborationType || typedCollab.collaboration_type;
      return type === 'recommendation';
    });
    
    // Debug: Log if we have collaborations but no recommendations
    if (collaborations.length > 0 && filtered.length === 0) {
      console.warn('No recommendations found. All collaborations:', collaborations.map(c => {
        const typedCollab = c as CollaborationResponseWithSnakeCase;
        return {
          id: c.id,
          collaborationType: c.collaborationType,
          collaboration_type: typedCollab.collaboration_type,
          allKeys: Object.keys(c),
        };
      }));
    }
    
    return filtered;
  }, [collaborations]);

  const essayCollaborations = useMemo(() => {
    return collaborations.filter(c => {
      // Check both camelCase and snake_case field names (defensive)
      const typedCollab = c as CollaborationResponseWithSnakeCase;
      const type = typedCollab.collaborationType || typedCollab.collaboration_type;
      return type === 'essayReview';
    });
  }, [collaborations]);

  // Filter essays to only show those that are not completed or in progress
  const activeEssays = useMemo(() => {
    return allEssays.filter(e => e.status !== 'completed');
  }, [allEssays]);

  // Create a map of application IDs to application names
  const applicationMap = useMemo(() => {
    const map = new Map<number, string>();
    applications.forEach(app => {
      map.set(app.id, app.scholarshipName);
    });
    return map;
  }, [applications]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'accent';
      case 'submitted':
        return 'success';
      case 'pending':
      case 'invited':
        return 'gray';
      case 'declined':
        return 'error';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Card variant="elevated" bg="white">
        <CardBody>
          <Stack align="center" py="4">
            <Spinner size="lg" />
            <Text>Loading collaborations...</Text>
          </Stack>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" bg="white">
        <CardBody>
          <Text color="error.500">{error}</Text>
        </CardBody>
      </Card>
    );
  }

  const renderCollaborationRow = (collab: CollaborationResponse) => {
    const applicationName = applicationMap.get(collab.applicationId) || 'Unknown Application';
    const collaborator = collaborators.get(collab.collaboratorId);
    const collaboratorName = collaborator
      ? `${collaborator.firstName} ${collaborator.lastName}`
      : `Collaborator #${collab.collaboratorId}`;

    return (
      <Tr
        key={collab.id}
        _hover={{
          bg: 'highlight.50',
          cursor: 'pointer',
        }}
        onClick={() => navigate(`/applications/${collab.applicationId}`)}
      >
        <Td fontWeight="medium" color="brand.700">
          {applicationName}
        </Td>
        <Td color="gray.600">{collaboratorName}</Td>
        <Td>
          <Badge
            colorScheme={getStatusColor(collab.status)}
            borderRadius="full"
            px="3"
            py="1"
            fontWeight="semibold"
          >
            {collab.status}
          </Badge>
        </Td>
        <Td color="gray.700">
          {collab.nextActionDueDate
            ? formatDate(collab.nextActionDueDate)
            : '-'}
        </Td>
        <Td>
          <Link
            color="accent.400"
            fontWeight="semibold"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/applications/${collab.applicationId}`);
            }}
            cursor="pointer"
            _hover={{ color: 'accent.500', textDecoration: 'underline' }}
          >
            View →
          </Link>
        </Td>
      </Tr>
    );
  };

  const renderEmptyState = (message: string, icon: string = '📝') => (
    <Box textAlign="center" py="12">
      <Box fontSize="5xl" mb="4" color="brand.500">
        {icon}
      </Box>
      <Text color="gray.600">{message}</Text>
    </Box>
  );

  const renderCollaborationCard = (collab: CollaborationResponse) => {
    const applicationName = applicationMap.get(collab.applicationId) || 'Unknown Application';
    const collaborator = collaborators.get(collab.collaboratorId);
    const collaboratorName = collaborator
      ? `${collaborator.firstName} ${collaborator.lastName}`
      : `Collaborator #${collab.collaboratorId}`;

    return (
      <Card
        key={collab.id}
        cursor="pointer"
        onClick={() => navigate(`/applications/${collab.applicationId}`)}
        variant="academic"
        bg="highlight.50"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        }}
        transition="all 0.3s"
      >
        <CardBody>
          <Stack spacing="3">
            <Flex justify="space-between" align="start">
              <Box flex="1">
                <Text fontWeight="bold" fontSize="md" mb="1" color="brand.700">
                  {applicationName}
                </Text>
                <Text fontSize="sm" color="gray.600" mb="2">
                  {collaboratorName}
                </Text>
              </Box>
              <Badge
                colorScheme={getStatusColor(collab.status)}
                borderRadius="full"
                px="3"
                py="1"
                fontWeight="semibold"
              >
                {collab.status}
              </Badge>
            </Flex>
            <HStack spacing="4" fontSize="sm" color="gray.600">
              {collab.nextActionDueDate && (
                <Text>
                  <Text as="span" fontWeight="semibold">Due:</Text>{' '}
                  {formatDate(collab.nextActionDueDate)}
                </Text>
              )}
            </HStack>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderEssayRow = (essay: EssayResponse) => {
    const applicationName = applicationMap.get(essay.applicationId) || 'Unknown Application';
    const statusLabel = essay.status === 'not_started' ? 'Not Started' : essay.status === 'in_progress' ? 'In Progress' : 'Completed';

    return (
      <Tr
        key={essay.id}
        _hover={{
          bg: 'highlight.50',
          cursor: 'pointer',
        }}
        onClick={() => navigate(`/applications/${essay.applicationId}`)}
      >
        <Td fontWeight="medium" color="brand.700">
          {applicationName}
        </Td>
        <Td color="gray.600">{essay.theme || 'Untitled Essay'}</Td>
        <Td>
          <Badge
            colorScheme={getStatusColor(essay.status || 'pending')}
            borderRadius="full"
            px="3"
            py="1"
            fontWeight="semibold"
          >
            {statusLabel}
          </Badge>
        </Td>
        <Td color="gray.700">
          {essay.wordCount ? `${essay.wordCount} words` : '-'}
        </Td>
        <Td>
          <Link
            color="accent.400"
            fontWeight="semibold"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/applications/${essay.applicationId}`);
            }}
            cursor="pointer"
            _hover={{ color: 'accent.500', textDecoration: 'underline' }}
          >
            View →
          </Link>
        </Td>
      </Tr>
    );
  };

  const renderEssayCard = (essay: EssayResponse) => {
    const applicationName = applicationMap.get(essay.applicationId) || 'Unknown Application';
    const statusLabel = essay.status === 'not_started' ? 'Not Started' : essay.status === 'in_progress' ? 'In Progress' : 'Completed';

    return (
      <Card
        key={essay.id}
        cursor="pointer"
        onClick={() => navigate(`/applications/${essay.applicationId}`)}
        variant="academic"
        bg="highlight.50"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        }}
        transition="all 0.3s"
      >
        <CardBody>
          <Stack spacing="3">
            <Flex justify="space-between" align="start">
              <Box flex="1">
                <Text fontWeight="bold" fontSize="md" mb="1" color="brand.700">
                  {applicationName}
                </Text>
                <Text fontSize="sm" color="gray.600" mb="2">
                  {essay.theme || 'Untitled Essay'}
                </Text>
              </Box>
              <Badge
                colorScheme={getStatusColor(essay.status || 'pending')}
                borderRadius="full"
                px="3"
                py="1"
                fontWeight="semibold"
              >
                {statusLabel}
              </Badge>
            </Flex>
            <HStack spacing="4" fontSize="sm" color="gray.600">
              {essay.wordCount && (
                <Text>
                  <Text as="span" fontWeight="semibold">Words:</Text>{' '}
                  {essay.wordCount}
                </Text>
              )}
            </HStack>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  return (
    <Card variant="elevated" bg="white">
      <CardHeader
        bg="highlight.50"
        borderTopRadius="xl"
        borderBottom="1px solid"
        borderColor="brand.200"
        py={{ base: '3', md: '4' }}
        px={{ base: '4', md: '6' }}
      >
        <Heading size="sm" color="brand.700">
          Collaborations
        </Heading>
      </CardHeader>
      <CardBody>
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>
              Recommendations
              {recommendations.length > 0 && (
                <Badge ml="2" colorScheme="accent" borderRadius="full" px="2" py="0.5">
                  {recommendations.length}
                </Badge>
              )}
            </Tab>
            <Tab>
              Essay Reviews
              {essayCollaborations.length > 0 && (
                <Badge ml="2" colorScheme="accent" borderRadius="full" px="2" py="0.5">
                  {essayCollaborations.length}
                </Badge>
              )}
            </Tab>
            <Tab>
              Essays
              {activeEssays.length > 0 && (
                <Badge ml="2" colorScheme="accent" borderRadius="full" px="2" py="0.5">
                  {activeEssays.length}
                </Badge>
              )}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px="0" pt="6">
              {recommendations.length === 0 ? (
                renderEmptyState('No recommendation requests yet.', '📝')
              ) : (
                <>
                  {/* Desktop Table View */}
                  <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                    <Table variant="simple" size="md">
                      <Thead>
                        <Tr>
                          <Th>Application</Th>
                          <Th>Collaborator</Th>
                          <Th>Status</Th>
                          <Th>Due Date</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {recommendations.map(renderCollaborationRow)}
                      </Tbody>
                    </Table>
                  </Box>
                  {/* Mobile Card View */}
                  <Stack spacing="4" display={{ base: 'flex', md: 'none' }}>
                    {recommendations.map(renderCollaborationCard)}
                  </Stack>
                </>
              )}
            </TabPanel>
            <TabPanel px="0" pt="6">
              {essayCollaborations.length === 0 ? (
                renderEmptyState('No essay review collaborations yet.', '✏️')
              ) : (
                <>
                  {/* Desktop Table View */}
                  <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                    <Table variant="simple" size="md">
                      <Thead>
                        <Tr>
                          <Th>Application</Th>
                          <Th>Collaborator</Th>
                          <Th>Status</Th>
                          <Th>Due Date</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {essayCollaborations.map(renderCollaborationRow)}
                      </Tbody>
                    </Table>
                  </Box>
                  {/* Mobile Card View */}
                  <Stack spacing="4" display={{ base: 'flex', md: 'none' }}>
                    {essayCollaborations.map(renderCollaborationCard)}
                  </Stack>
                </>
              )}
            </TabPanel>
            <TabPanel px="0" pt="6">
              {activeEssays.length === 0 ? (
                renderEmptyState('No essays in progress.', '📝')
              ) : (
                <>
                  {/* Desktop Table View */}
                  <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                    <Table variant="simple" size="md">
                      <Thead>
                        <Tr>
                          <Th>Application</Th>
                          <Th>Theme</Th>
                          <Th>Status</Th>
                          <Th>Word Count</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {activeEssays.map(renderEssayRow)}
                      </Tbody>
                    </Table>
                  </Box>
                  {/* Mobile Card View */}
                  <Stack spacing="4" display={{ base: 'flex', md: 'none' }}>
                    {activeEssays.map(renderEssayCard)}
                  </Stack>
                </>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  );
}

export default DashboardCollaborations;
