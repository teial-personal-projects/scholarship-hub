/**
 * Collaborators Page
 * Manage all collaborators (recommenders, essay reviewers, counselors)
 */

import { useEffect, useState } from 'react';
import {
  Container,
  Heading,
  Button,
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
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Box,
  Badge,
  Card,
  CardBody,
  Flex,
  HStack,
} from '@chakra-ui/react';
import { apiDelete } from '../services/api';
import type { CollaboratorResponse } from '@scholarship-hub/shared';
import CollaboratorForm from '../components/CollaboratorForm';
import { useToastHelpers } from '../utils/toast';
import { useRef } from 'react';
import { useCollaborators } from '../hooks/useCollaborators';

function Collaborators() {
  const { showSuccess, showError } = useToastHelpers();
  const { collaborators, loading, fetchCollaborators } = useCollaborators();
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorResponse | null>(null);
  const [deleteCollaboratorId, setDeleteCollaboratorId] = useState<number | null>(null);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleAddCollaborator = () => {
    setSelectedCollaborator(null);
    onFormOpen();
  };

  const handleEditCollaborator = (collaborator: CollaboratorResponse) => {
    setSelectedCollaborator(collaborator);
    onFormOpen();
  };

  const handleDeleteClick = (collaboratorId: number) => {
    setDeleteCollaboratorId(collaboratorId);
    onDeleteOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCollaboratorId) return;

    try {
      await apiDelete(`/collaborators/${deleteCollaboratorId}`);
      showSuccess('Success', 'Collaborator deleted successfully', 3000);
      await fetchCollaborators();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete collaborator';
      showError('Error', errorMessage);
    } finally {
      setDeleteCollaboratorId(null);
      onDeleteClose();
    }
  };

  const handleFormSuccess = async () => {
    await fetchCollaborators();
  };

  // Group collaborators by typical collaboration types
  const recommenders = collaborators.filter(c =>
    c.relationship?.toLowerCase().includes('teacher') ||
    c.relationship?.toLowerCase().includes('professor') ||
    c.relationship?.toLowerCase().includes('recommender')
  );

  const essayEditors = collaborators.filter(c =>
    c.relationship?.toLowerCase().includes('editor') ||
    c.relationship?.toLowerCase().includes('tutor') ||
    c.relationship?.toLowerCase().includes('mentor')
  );

  const counselors = collaborators.filter(c =>
    c.relationship?.toLowerCase().includes('counselor') ||
    c.relationship?.toLowerCase().includes('advisor')
  );

  // All others
  const others = collaborators.filter(c =>
    !recommenders.includes(c) &&
    !essayEditors.includes(c) &&
    !counselors.includes(c)
  );

  const renderCollaboratorsTable = (collaboratorsList: CollaboratorResponse[]) => {
    if (collaboratorsList.length === 0) {
      return <Text color="gray.500">No collaborators in this category</Text>;
    }

    return (
      <>
        {/* Desktop Table View */}
        <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Relationship</Th>
                <Th>Phone</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {collaboratorsList.map((collab) => (
                <Tr key={collab.id}>
                  <Td fontWeight="semibold">
                    {collab.firstName} {collab.lastName}
                  </Td>
                  <Td>{collab.emailAddress}</Td>
                  <Td>
                    {collab.relationship ? (
                      <Badge colorScheme="blue">{collab.relationship}</Badge>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>{collab.phoneNumber || '-'}</Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<Text>⋮</Text>}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem onClick={() => handleEditCollaborator(collab)}>Edit</MenuItem>
                        <MenuItem color="red.500" onClick={() => handleDeleteClick(collab.id)}>
                          Delete
                        </MenuItem>
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
          {collaboratorsList.map((collab) => (
            <Card key={collab.id}>
              <CardBody>
                <Flex justify="space-between" align="start">
                  <Box flex="1" minW="0">
                    <Text fontWeight="bold" fontSize="md" mb="1">
                      {collab.firstName} {collab.lastName}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb="2" wordBreak="break-all">
                      {collab.emailAddress}
                    </Text>
                    <HStack spacing="2" mb="2" flexWrap="wrap">
                      {collab.relationship && (
                        <Badge colorScheme="blue" fontSize="xs">
                          {collab.relationship}
                        </Badge>
                      )}
                      {collab.phoneNumber && (
                        <Text fontSize="xs" color="gray.600">
                          {collab.phoneNumber}
                        </Text>
                      )}
                    </HStack>
                  </Box>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<Text>⋮</Text>}
                      variant="ghost"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem onClick={() => handleEditCollaborator(collab)}>Edit</MenuItem>
                      <MenuItem color="red.500" onClick={() => handleDeleteClick(collab.id)}>
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
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
          <Text>Loading collaborators...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
      <Stack spacing={{ base: '4', md: '6' }}>
        {/* Header */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
          <Heading size={{ base: 'md', md: 'lg' }}>Collaborators</Heading>
          <Button 
            colorScheme="blue" 
            onClick={handleAddCollaborator}
            size={{ base: 'sm', md: 'md' }}
          >
            Add Collaborator
          </Button>
        </Flex>

        {/* Tabs for different collaborator types */}
        <Tabs colorScheme="blue">
          <Box overflowX="auto" overflowY="hidden">
            <TabList display="flex" minW="max-content" flexWrap={{ base: 'nowrap', md: 'wrap' }}>
              <Tab whiteSpace="nowrap">All ({collaborators.length})</Tab>
              <Tab whiteSpace="nowrap">Recommenders ({recommenders.length})</Tab>
              <Tab whiteSpace="nowrap">Essay Editors ({essayEditors.length})</Tab>
              <Tab whiteSpace="nowrap">Counselors ({counselors.length})</Tab>
              <Tab whiteSpace="nowrap">Others ({others.length})</Tab>
            </TabList>
          </Box>

          <TabPanels>
            <TabPanel px={0}>
              {renderCollaboratorsTable(collaborators)}
            </TabPanel>
            <TabPanel px={0}>
              {renderCollaboratorsTable(recommenders)}
            </TabPanel>
            <TabPanel px={0}>
              {renderCollaboratorsTable(essayEditors)}
            </TabPanel>
            <TabPanel px={0}>
              {renderCollaboratorsTable(counselors)}
            </TabPanel>
            <TabPanel px={0}>
              {renderCollaboratorsTable(others)}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>

      {/* Collaborator Form Modal */}
      <CollaboratorForm
        isOpen={isFormOpen}
        onClose={onFormClose}
        collaborator={selectedCollaborator}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Collaborator
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this collaborator? This will also remove all associated
              collaborations. This action cannot be undone.
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
    </Container>
  );
}

export default Collaborators;
