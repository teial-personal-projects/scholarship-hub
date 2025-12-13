import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  CardRoot,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Stack,
  Badge,
  Spinner,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
  HStack,
  Link,
  Flex,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import type { ApplicationResponse, CollaborationResponse, CollaborationResponseWithSnakeCase, CollaboratorResponse, EssayResponse } from '@scholarship-hub/shared';
import { formatDate } from '../utils/date';

function DashboardCollaborations() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorResponse>>(new Map());
  const [allEssays, setAllEssays] = useState<EssayResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'essayReviews' | 'essays'>('recommendations');

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
      <CardRoot variant="elevated" bg="white">
        <CardBody>
          <Stack align="center" py="4">
            <Spinner size="lg" />
            <Text>Loading collaborations...</Text>
          </Stack>
        </CardBody>
      </CardRoot>
    );
  }

  if (error) {
    return (
      <CardRoot variant="elevated" bg="white">
        <CardBody>
          <Text color="error.500">{error}</Text>
        </CardBody>
      </CardRoot>
    );
  }

  const renderCollaborationRow = (collab: CollaborationResponse) => {
    const applicationName = applicationMap.get(collab.applicationId) || 'Unknown Application';
    const collaborator = collaborators.get(collab.collaboratorId);
    const collaboratorName = collaborator
      ? `${collaborator.firstName} ${collaborator.lastName}`
      : `Collaborator #${collab.collaboratorId}`;

    return (
      <TableRow
        key={collab.id}
        _hover={{
          bg: 'highlight.50',
          cursor: 'pointer',
        }}
        onClick={() => navigate(`/applications/${collab.applicationId}`)}
      >
        <TableCell fontWeight="medium" color="brand.700">
          {applicationName}
        </TableCell>
        <TableCell color="gray.600">{collaboratorName}</TableCell>
        <TableCell>
          <Badge
            colorPalette={getStatusColor(collab.status)}
            borderRadius="full"
            px="3"
            py="1"
            fontWeight="semibold"
          >
            {collab.status}
          </Badge>
        </TableCell>
        <TableCell color="gray.700">
          {collab.nextActionDueDate
            ? formatDate(collab.nextActionDueDate)
            : '-'}
        </TableCell>
        <TableCell>
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
        </TableCell>
      </TableRow>
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
      <CardRoot
        key={collab.id}
        cursor="pointer"
        onClick={() => navigate(`/applications/${collab.applicationId}`)}
        variant="outline"
        bg="highlight.50"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        }}
        transition="all 0.3s"
      >
        <CardBody>
          <Stack gap="3">
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
                colorPalette={getStatusColor(collab.status)}
                borderRadius="full"
                px="3"
                py="1"
                fontWeight="semibold"
              >
                {collab.status}
              </Badge>
            </Flex>
            <HStack gap="4" fontSize="sm" color="gray.600">
              {collab.nextActionDueDate && (
                <Text>
                  <Text as="span" fontWeight="semibold">Due:</Text>{' '}
                  {formatDate(collab.nextActionDueDate)}
                </Text>
              )}
            </HStack>
          </Stack>
        </CardBody>
      </CardRoot>
    );
  };

  const renderEssayRow = (essay: EssayResponse) => {
    const applicationName = applicationMap.get(essay.applicationId) || 'Unknown Application';
    const statusLabel = essay.status === 'not_started' ? 'Not Started' : essay.status === 'in_progress' ? 'In Progress' : 'Completed';

    return (
      <TableRow
        key={essay.id}
        _hover={{
          bg: 'highlight.50',
          cursor: 'pointer',
        }}
        onClick={() => navigate(`/applications/${essay.applicationId}`)}
      >
        <TableCell fontWeight="medium" color="brand.700">
          {applicationName}
        </TableCell>
        <TableCell color="gray.600">{essay.theme || 'Untitled Essay'}</TableCell>
        <TableCell>
          <Badge
            colorPalette={getStatusColor(essay.status || 'pending')}
            borderRadius="full"
            px="3"
            py="1"
            fontWeight="semibold"
          >
            {statusLabel}
          </Badge>
        </TableCell>
        <TableCell color="gray.700">
          {essay.wordCount ? `${essay.wordCount} words` : '-'}
        </TableCell>
        <TableCell>
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
        </TableCell>
      </TableRow>
    );
  };

  const renderEssayCard = (essay: EssayResponse) => {
    const applicationName = applicationMap.get(essay.applicationId) || 'Unknown Application';
    const statusLabel = essay.status === 'not_started' ? 'Not Started' : essay.status === 'in_progress' ? 'In Progress' : 'Completed';

    return (
      <CardRoot
        key={essay.id}
        cursor="pointer"
        onClick={() => navigate(`/applications/${essay.applicationId}`)}
        variant="outline"
        bg="highlight.50"
        _hover={{
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        }}
        transition="all 0.3s"
      >
        <CardBody>
          <Stack gap="3">
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
                colorPalette={getStatusColor(essay.status || 'pending')}
                borderRadius="full"
                px="3"
                py="1"
                fontWeight="semibold"
              >
                {statusLabel}
              </Badge>
            </Flex>
            <HStack gap="4" fontSize="sm" color="gray.600">
              {essay.wordCount && (
                <Text>
                  <Text as="span" fontWeight="semibold">Words:</Text>{' '}
                  {essay.wordCount}
                </Text>
              )}
            </HStack>
          </Stack>
        </CardBody>
      </CardRoot>
    );
  };

  return (
    <CardRoot variant="elevated" bg="white">
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
        <TabsRoot value={activeTab} onValueChange={(details) => setActiveTab(details.value as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="recommendations">
              Recommendations
              {recommendations.length > 0 && (
                <Badge ml="2" colorPalette="accent" borderRadius="full" px="2" py="0.5">
                  {recommendations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="essayReviews">
              Essay Reviews
              {essayCollaborations.length > 0 && (
                <Badge ml="2" colorPalette="accent" borderRadius="full" px="2" py="0.5">
                  {essayCollaborations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="essays">
              Essays
              {activeEssays.length > 0 && (
                <Badge ml="2" colorPalette="accent" borderRadius="full" px="2" py="0.5">
                  {activeEssays.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" px="0" pt="6">
              {recommendations.length === 0 ? (
                renderEmptyState('No recommendation requests yet.', '📝')
              ) : (
                <>
                  {/* Desktop Table View */}
                  <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                    <TableRoot size="md">
                      <TableHeader>
                        <TableRow>
                          <TableColumnHeader>Application</TableColumnHeader>
                          <TableColumnHeader>Collaborator</TableColumnHeader>
                          <TableColumnHeader>Status</TableColumnHeader>
                          <TableColumnHeader>Due Date</TableColumnHeader>
                          <TableColumnHeader>Actions</TableColumnHeader>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recommendations.map(renderCollaborationRow)}
                      </TableBody>
                    </TableRoot>
                  </Box>
                  {/* Mobile Card View */}
                  <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                    {recommendations.map(renderCollaborationCard)}
                  </Stack>
                </>
              )}
          </TabsContent>
          <TabsContent value="essayReviews" px="0" pt="6">
              {essayCollaborations.length === 0 ? (
                renderEmptyState('No essay review collaborations yet.', '✏️')
              ) : (
                <>
                  {/* Desktop Table View */}
                  <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                    <TableRoot size="md">
                      <TableHeader>
                        <TableRow>
                          <TableColumnHeader>Application</TableColumnHeader>
                          <TableColumnHeader>Collaborator</TableColumnHeader>
                          <TableColumnHeader>Status</TableColumnHeader>
                          <TableColumnHeader>Due Date</TableColumnHeader>
                          <TableColumnHeader>Actions</TableColumnHeader>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {essayCollaborations.map(renderCollaborationRow)}
                      </TableBody>
                    </TableRoot>
                  </Box>
                  {/* Mobile Card View */}
                  <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                    {essayCollaborations.map(renderCollaborationCard)}
                  </Stack>
                </>
              )}
          </TabsContent>
          <TabsContent value="essays" px="0" pt="6">
              {activeEssays.length === 0 ? (
                renderEmptyState('No essays in progress.', '📝')
              ) : (
                <>
                  {/* Desktop Table View */}
                  <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                    <TableRoot size="md">
                      <TableHeader>
                        <TableRow>
                          <TableColumnHeader>Application</TableColumnHeader>
                          <TableColumnHeader>Theme</TableColumnHeader>
                          <TableColumnHeader>Status</TableColumnHeader>
                          <TableColumnHeader>Word Count</TableColumnHeader>
                          <TableColumnHeader>Actions</TableColumnHeader>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeEssays.map(renderEssayRow)}
                      </TableBody>
                    </TableRoot>
                  </Box>
                  {/* Mobile Card View */}
                  <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                    {activeEssays.map(renderEssayCard)}
                  </Stack>
                </>
              )}
          </TabsContent>
        </TabsRoot>
      </CardBody>
    </CardRoot>
  );
}

export default DashboardCollaborations;
