import { useEffect, useState } from 'react';
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
  useToast,
  Badge,
  Flex,
  Divider,
  SimpleGrid,
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
} from '@chakra-ui/react';
import { apiGet } from '../services/api';
import type { ApplicationResponse, EssayResponse, CollaborationResponse } from '@scholarship-hub/shared';

function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [essays, setEssays] = useState<EssayResponse[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        } catch (err) {
          // If no collaborations exist, that's okay
          setCollaborations([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load application';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, toast]);

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

  const getCollaborationTypeLabel = (type: string) => {
    switch (type) {
      case 'recommendation':
        return 'Recommendation';
      case 'essayReview':
        return 'Essay Review';
      case 'guidance':
        return 'Guidance';
      default:
        return type;
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

  return (
    <Container maxW="7xl" py={{ base: '8', md: '12' }}>
      <Stack spacing="6">
        {/* Header */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
          <Box>
            <Heading size="lg" mb="2">
              {application.scholarshipName}
            </Heading>
            <HStack spacing="2">
              <Badge colorScheme={getStatusColor(application.status)} fontSize="md">
                {application.status}
              </Badge>
              {application.targetType && (
                <Badge colorScheme="purple">{application.targetType}</Badge>
              )}
            </HStack>
          </Box>
          <HStack spacing="3">
            <Button
              colorScheme="blue"
              onClick={() => navigate(`/applications/${id}/edit`)}
            >
              Edit Application
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/applications')}
            >
              Back to List
            </Button>
          </HStack>
        </Flex>

        {/* Application Details */}
        <Card>
          <CardHeader>
            <Heading size="md">Application Details</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing="6">
              <Box>
                <Text fontWeight="bold" mb="1">Organization</Text>
                <Text>{application.organization || 'Not specified'}</Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb="1">Due Date</Text>
                <Text>
                  {application.dueDate
                    ? new Date(application.dueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Not specified'}
                </Text>
              </Box>

              {application.openDate && (
                <Box>
                  <Text fontWeight="bold" mb="1">Open Date</Text>
                  <Text>
                    {new Date(application.openDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </Box>
              )}

              {application.submissionDate && (
                <Box>
                  <Text fontWeight="bold" mb="1">Submission Date</Text>
                  <Text>
                    {new Date(application.submissionDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </Box>
              )}

              {(application.minAward || application.maxAward) && (
                <Box>
                  <Text fontWeight="bold" mb="1">Award Amount</Text>
                  <Text>
                    {application.minAward && application.maxAward
                      ? `$${application.minAward.toLocaleString()} - $${application.maxAward.toLocaleString()}`
                      : application.minAward
                      ? `$${application.minAward.toLocaleString()}+`
                      : application.maxAward
                      ? `Up to $${application.maxAward.toLocaleString()}`
                      : 'Not specified'}
                  </Text>
                </Box>
              )}

              {application.renewable && (
                <Box>
                  <Text fontWeight="bold" mb="1">Renewable</Text>
                  <Text>Yes</Text>
                </Box>
              )}

              {application.platform && (
                <Box>
                  <Text fontWeight="bold" mb="1">Platform</Text>
                  <Text>{application.platform}</Text>
                </Box>
              )}

              {application.theme && (
                <Box>
                  <Text fontWeight="bold" mb="1">Theme/Focus</Text>
                  <Text>{application.theme}</Text>
                </Box>
              )}

              {application.currentAction && (
                <Box>
                  <Text fontWeight="bold" mb="1">Current Action</Text>
                  <Text>{application.currentAction}</Text>
                </Box>
              )}
            </SimpleGrid>

            {application.requirements && (
              <>
                <Divider my="6" />
                <Box>
                  <Text fontWeight="bold" mb="2">Requirements</Text>
                  <Text whiteSpace="pre-wrap">{application.requirements}</Text>
                </Box>
              </>
            )}

            {application.renewableTerms && (
              <>
                <Divider my="6" />
                <Box>
                  <Text fontWeight="bold" mb="2">Renewable Terms</Text>
                  <Text whiteSpace="pre-wrap">{application.renewableTerms}</Text>
                </Box>
              </>
            )}

            {/* Links */}
            {(application.orgWebsite || application.applicationLink || application.documentInfoLink) && (
              <>
                <Divider my="6" />
                <Box>
                  <Text fontWeight="bold" mb="3">Links</Text>
                  <Stack spacing="2">
                    {application.orgWebsite && (
                      <ChakraLink href={application.orgWebsite} isExternal color="blue.500">
                        Organization Website →
                      </ChakraLink>
                    )}
                    {application.applicationLink && (
                      <ChakraLink href={application.applicationLink} isExternal color="blue.500">
                        Application Portal →
                      </ChakraLink>
                    )}
                    {application.documentInfoLink && (
                      <ChakraLink href={application.documentInfoLink} isExternal color="blue.500">
                        Document Information →
                      </ChakraLink>
                    )}
                  </Stack>
                </Box>
              </>
            )}
          </CardBody>
        </Card>

        {/* Essays Section */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">Essays ({essays.length})</Heading>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => toast({
                  title: 'Coming Soon',
                  description: 'Essay management will be available in the next update',
                  status: 'info',
                  duration: 3000,
                })}
              >
                Add Essay
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            {essays.length === 0 ? (
              <Text color="gray.500">No essays added yet</Text>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Theme</Th>
                    <Th>Word Count</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {essays.map((essay) => (
                    <Tr key={essay.id}>
                      <Td>{essay.theme || 'Untitled'}</Td>
                      <Td>{essay.wordCount || '-'}</Td>
                      <Td>
                        {essay.essayLink && (
                          <ChakraLink href={essay.essayLink} isExternal color="blue.500" mr="3">
                            View
                          </ChakraLink>
                        )}
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<Text>⋮</Text>}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem>Edit</MenuItem>
                            <MenuItem color="red.500">Delete</MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Collaborations Section */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">Collaborations ({collaborations.length})</Heading>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => toast({
                  title: 'Coming Soon',
                  description: 'Collaboration management will be available in the next update',
                  status: 'info',
                  duration: 3000,
                })}
              >
                Add Collaborator
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            {collaborations.length === 0 ? (
              <Text color="gray.500">No collaborations added yet</Text>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Due Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {collaborations.map((collab) => (
                    <Tr key={collab.id}>
                      <Td>{getCollaborationTypeLabel(collab.collaborationType)}</Td>
                      <Td>
                        <Badge colorScheme={getCollaborationStatusColor(collab.status)}>
                          {collab.status}
                        </Badge>
                      </Td>
                      <Td>
                        {collab.nextActionDueDate
                          ? new Date(collab.nextActionDueDate).toLocaleDateString()
                          : '-'}
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
                            <MenuItem>View Details</MenuItem>
                            <MenuItem>Send Reminder</MenuItem>
                            <MenuItem color="red.500">Remove</MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </Stack>
    </Container>
  );
}

export default ApplicationDetail;
