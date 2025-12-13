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
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  Text,
  IconButton,
  MenuRoot,
  MenuTrigger,
  MenuPositioner,
  MenuContent,
  MenuItem,
  Spinner,
  useDisclosure,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogCloseTrigger,
  Box,
  Badge,
  CardRoot,
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

  const { open: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { open: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose, setOpen: setDeleteOpen } = useDisclosure();
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

  const renderCollaboratorsTable = () => {
    if (collaborators.length === 0) {
      return <Text color="gray.500">No collaborators yet. Add your first collaborator to get started.</Text>;
    }

    return (
      <>
        {/* Desktop Table View */}
        <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
          <TableRoot>
            <TableHeader>
              <TableRow>
                <TableColumnHeader>Name</TableColumnHeader>
                <TableColumnHeader>Email</TableColumnHeader>
                <TableColumnHeader>Relationship</TableColumnHeader>
                <TableColumnHeader>Phone</TableColumnHeader>
                <TableColumnHeader>Actions</TableColumnHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.map((collab) => (
                <TableRow key={collab.id}>
                  <TableCell fontWeight="semibold">
                    {collab.firstName} {collab.lastName}
                  </TableCell>
                  <TableCell>{collab.emailAddress}</TableCell>
                  <TableCell>
                    {collab.relationship ? (
                      <Badge colorScheme="blue">{collab.relationship}</Badge>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </TableCell>
                  <TableCell>{collab.phoneNumber || '-'}</TableCell>
                  <TableCell>
                    <MenuRoot>
                      <MenuTrigger asChild>
                        <IconButton variant="ghost" size="sm" aria-label="Collaborator actions">
                          <Text aria-hidden>⋮</Text>
                        </IconButton>
                      </MenuTrigger>
                      <MenuPositioner>
                        <MenuContent>
                          <MenuItem value="edit" onClick={() => handleEditCollaborator(collab)}>
                            Edit
                          </MenuItem>
                          <MenuItem value="delete" color="red.500" onClick={() => handleDeleteClick(collab.id)}>
                            Delete
                          </MenuItem>
                        </MenuContent>
                      </MenuPositioner>
                    </MenuRoot>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        </Box>

        {/* Mobile Card View */}
        <Stack gap="3" display={{ base: 'flex', md: 'none' }}>
          {collaborators.map((collab) => (
            <CardRoot key={collab.id}>
              <CardBody>
                <Flex justify="space-between" align="start">
                  <Box flex="1" minW="0">
                    <Text fontWeight="bold" fontSize="md" mb="1">
                      {collab.firstName} {collab.lastName}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb="2" wordBreak="break-all">
                      {collab.emailAddress}
                    </Text>
                    <HStack gap="2" mb="2" flexWrap="wrap">
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
                  <MenuRoot>
                    <MenuTrigger asChild>
                      <IconButton variant="ghost" size="sm" aria-label="Collaborator actions">
                        <Text aria-hidden>⋮</Text>
                      </IconButton>
                    </MenuTrigger>
                    <MenuPositioner>
                      <MenuContent>
                        <MenuItem value="edit" onClick={() => handleEditCollaborator(collab)}>
                          Edit
                        </MenuItem>
                        <MenuItem value="delete" color="red.500" onClick={() => handleDeleteClick(collab.id)}>
                          Delete
                        </MenuItem>
                      </MenuContent>
                    </MenuPositioner>
                  </MenuRoot>
                </Flex>
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
          <Text>Loading collaborators...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
      <Stack gap={{ base: '4', md: '6' }}>
        {/* Header */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
          <Heading size={{ base: 'md', md: 'lg' }}>Collaborators</Heading>
          <Button 
            colorPalette="blue" 
            onClick={handleAddCollaborator}
            size={{ base: 'sm', md: 'md' }}
          >
            Add Collaborator
          </Button>
        </Flex>

        {/* Collaborators Table */}
        {renderCollaboratorsTable()}
      </Stack>

      {/* Collaborator Form Modal */}
      <CollaboratorForm
        isOpen={isFormOpen}
        onClose={onFormClose}
        collaborator={selectedCollaborator}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DialogRoot open={isDeleteOpen} onOpenChange={(details) => setDeleteOpen(details.open)}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="sm" w={{ base: '100vw', sm: 'auto' }}>
            <DialogHeader>
              <DialogTitle>Delete Collaborator</DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <DialogBody>
              Are you sure you want to delete this collaborator? This will also remove all associated collaborations. This action cannot be undone.
            </DialogBody>
            <DialogFooter>
              <Button ref={cancelRef} variant="outline" onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorPalette="red" onClick={handleDeleteConfirm} ml={3}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Container>
  );
}

export default Collaborators;
