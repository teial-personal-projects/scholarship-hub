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
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { apiGet, apiDelete } from '../services/api';
import type { ApplicationResponse, EssayResponse, CollaborationResponse, CollaboratorResponse } from '@scholarship-hub/shared';
import EssayForm from '../components/EssayForm';
import SendInviteDialog from '../components/SendInviteDialog';
import { useRef } from 'react';

function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

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

  // Collaboration invitation
  const { isOpen: isInviteDialogOpen, onOpen: onInviteDialogOpen, onClose: onInviteDialogClose } = useDisclosure();
  const [selectedCollaboration, setSelectedCollaboration] = useState<CollaborationResponse | null>(null);

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

          // Fetch collaborator details for each collaboration
          if (collabsData && collabsData.length > 0) {
            const collaboratorMap = new Map<number, CollaboratorResponse>();
            for (const collab of collabsData) {
              if (!collaboratorMap.has(collab.collaboratorId)) {
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
      toast({
        title: 'Success',
        description: 'Essay deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Refresh essays list
      const essaysData = await apiGet<EssayResponse[]>(`/applications/${id}/essays`);
      setEssays(essaysData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete essay';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
    } catch (err) {
      setCollaborations([]);
    }
  };

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
                onClick={handleAddEssay}
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
                            {(collab.status === 'pending' || collab.status === 'not_invited') && (
                              <MenuItem onClick={() => handleSendInvite(collab)}>
                                Send Invite
                              </MenuItem>
                            )}
                            {collab.status === 'invited' && (
                              <MenuItem onClick={() => handleSendInvite(collab)}>
                                Resend Invite
                              </MenuItem>
                            )}
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
    </Container>
  );
}

export default ApplicationDetail;
