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
import type { ApplicationResponse, CollaborationResponse, CollaborationResponseWithSnakeCase, CollaboratorResponse, DashboardReminders } from '@scholarship-hub/shared';
import { formatDate } from '../utils/date';

function DashboardPendingResponses() {
  const navigate = useNavigate();
  const [pendingResponses, setPendingResponses] = useState<CollaborationResponse[]>([]);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [collaborators, setCollaborators] = useState<Map<number, CollaboratorResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'essays'>('recommendations');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch reminders to get pending responses
        const remindersData = await apiGet<DashboardReminders>('/users/me/reminders');
        const pending = remindersData?.collaborations?.pendingResponse || [];
        setPendingResponses(pending);

        if (pending.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch all applications
        const applicationsData = await apiGet<ApplicationResponse[]>('/applications');
        setApplications(applicationsData || []);

        // Fetch collaborator details
        const collaboratorIds = new Set<number>();
        pending.forEach(collab => {
          collaboratorIds.add(collab.collaboratorId);
          // Check if collaborator data is embedded in response
          const collabWithEmbedded = collab as CollaborationResponse & { collaborator?: CollaboratorResponse };
          if (collabWithEmbedded.collaborator && collabWithEmbedded.collaborator.id) {
            collaboratorIds.delete(collabWithEmbedded.collaborator.id); // Will add from embedded data
          }
        });

        const collaboratorMap = new Map<number, CollaboratorResponse>();
        
        // First, check for embedded collaborator data in collaboration responses
        pending.forEach(collab => {
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
        const errorMessage = err instanceof Error ? err.message : 'Failed to load pending responses data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter pending responses by type
  const recommendations = useMemo(() => {
    return pendingResponses.filter(c => {
      // Check both camelCase and snake_case field names (defensive)
      const typedCollab = c as CollaborationResponseWithSnakeCase;
      const type = typedCollab.collaborationType || typedCollab.collaboration_type;
      return type === 'recommendation';
    });
  }, [pendingResponses]);

  const essays = useMemo(() => {
    return pendingResponses.filter(c => {
      // Check both camelCase and snake_case field names (defensive)
      const typedCollab = c as CollaborationResponseWithSnakeCase;
      const type = typedCollab.collaborationType || typedCollab.collaboration_type;
      return type === 'essayReview';
    });
  }, [pendingResponses]);

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
            <Text>Loading pending responses...</Text>
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

  // If no pending responses, don't render anything (after loading is complete)
  if (!loading && pendingResponses.length === 0) {
    return null;
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
          {collab.nextActionDueDate ? formatDate(collab.nextActionDueDate) : '-'}
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
          Pending Responses
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
            <TabsTrigger value="essays">
              Essays
              {essays.length > 0 && (
                <Badge ml="2" colorPalette="accent" borderRadius="full" px="2" py="0.5">
                  {essays.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" px="0" pt="6">
              {recommendations.length === 0 ? (
                renderEmptyState('No pending recommendation responses.', '📝')
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
          <TabsContent value="essays" px="0" pt="6">
              {essays.length === 0 ? (
                renderEmptyState('No pending essay review responses.', '✏️')
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
                        {essays.map(renderCollaborationRow)}
                      </TableBody>
                    </TableRoot>
                  </Box>
                  {/* Mobile Card View */}
                  <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                    {essays.map(renderCollaborationCard)}
                  </Stack>
                </>
              )}
          </TabsContent>
        </TabsRoot>
      </CardBody>
    </CardRoot>
  );
}

export default DashboardPendingResponses;
