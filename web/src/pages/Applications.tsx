import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Flex,
  IconButton,
  Input,
  Select,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { apiGet, apiDelete } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ApplicationResponse } from '@scholarship-hub/shared';

function Applications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchApplications() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ApplicationResponse[]>('/applications');
        setApplications(data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load applications';
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

    fetchApplications();
  }, [user, toast]);

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch = app.scholarshipName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (app.organization?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredApplications.slice(startIndex, endIndex);
  }, [filteredApplications, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      await apiDelete(`/applications/${deleteId}`);
      setApplications(applications.filter(app => app.id !== deleteId));
      toast({
        title: 'Success',
        description: 'Application deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
      setDeleteId(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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

  if (authLoading || loading) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading applications...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Card>
          <CardBody>
            <Text color="red.500">{error}</Text>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={{ base: '8', md: '12' }}>
      <Stack spacing="8">
        {/* Header */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
          <Box>
            <Heading size="lg" mb="2">
              Applications
            </Heading>
            <Text color="gray.600">
              Manage all your scholarship applications in one place
            </Text>
          </Box>
          <Button
            colorScheme="blue"
            onClick={() => navigate('/applications/new')}
          >
            New Application
          </Button>
        </Flex>

        {/* Filters */}
        <Card>
          <CardBody>
            <HStack spacing="4" flexWrap="wrap">
              <Box flex="1" minW="200px">
                <Input
                  placeholder="Search by name or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Box>
              <Box minW="150px">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Awarded">Awarded</option>
                  <option value="Not Awarded">Not Awarded</option>
                </Select>
              </Box>
            </HStack>
          </CardBody>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
              <Heading size="md">
                {filteredApplications.length} Application{filteredApplications.length !== 1 ? 's' : ''}
              </Heading>
              {filteredApplications.length > 0 && (
                <Text color="gray.600" fontSize="sm">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredApplications.length)} of {filteredApplications.length}
                </Text>
              )}
            </Flex>
          </CardHeader>
          <CardBody>
            {filteredApplications.length === 0 ? (
              <Box textAlign="center" py="8">
                <Text color="gray.500" mb="4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'No applications match your filters'
                    : "You don't have any applications yet"}
                </Text>
                {!searchTerm && statusFilter === 'all' && (
                  <Button
                    colorScheme="blue"
                    onClick={() => navigate('/applications/new')}
                  >
                    Create Your First Application
                  </Button>
                )}
              </Box>
            ) : (
              <Stack spacing="4">
                <Box overflowX="auto">
                  <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
                    <Thead>
                      <Tr>
                        <Th>Scholarship Name</Th>
                        <Th display={{ base: 'none', md: 'table-cell' }}>Organization</Th>
                        <Th>Status</Th>
                        <Th>Due Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedApplications.map((app) => (
                        <Tr key={app.id}>
                          <Td fontWeight="medium">{app.scholarshipName}</Td>
                          <Td display={{ base: 'none', md: 'table-cell' }}>
                            {app.organization || '-'}
                          </Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(app.status)}>
                              {app.status}
                            </Badge>
                          </Td>
                          <Td>
                            {app.dueDate
                              ? new Date(app.dueDate).toLocaleDateString()
                              : '-'}
                          </Td>
                          <Td>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<Text>⋮</Text>}
                                variant="ghost"
                                size="sm"
                                aria-label="Actions"
                              />
                              <MenuList>
                                <MenuItem onClick={() => navigate(`/applications/${app.id}`)}>
                                  View Details
                                </MenuItem>
                                <MenuItem onClick={() => navigate(`/applications/${app.id}/edit`)}>
                                  Edit
                                </MenuItem>
                                <MenuItem
                                  color="red.500"
                                  onClick={() => handleDeleteClick(app.id)}
                                >
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <Flex
                    justify="center"
                    align="center"
                    gap="2"
                    flexWrap="wrap"
                    pt="4"
                    borderTop="1px solid"
                    borderColor="gray.200"
                  >
                    <IconButton
                      aria-label="Previous page"
                      icon={<Text>‹</Text>}
                      onClick={() => handlePageChange(currentPage - 1)}
                      isDisabled={currentPage === 1}
                      size="sm"
                    />

                    <HStack spacing="1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, array) => {
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <Box key={page}>
                              {showEllipsis && (
                                <Text as="span" px="2" color="gray.500">
                                  ...
                                </Text>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                colorScheme={currentPage === page ? 'blue' : 'gray'}
                                variant={currentPage === page ? 'solid' : 'outline'}
                              >
                                {page}
                              </Button>
                            </Box>
                          );
                        })}
                    </HStack>

                    <IconButton
                      aria-label="Next page"
                      icon={<Text>›</Text>}
                      onClick={() => handlePageChange(currentPage + 1)}
                      isDisabled={currentPage === totalPages}
                      size="sm"
                    />
                  </Flex>
                )}
              </Stack>
            )}
          </CardBody>
        </Card>
      </Stack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Application
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This will permanently delete the application and all associated essays and collaborations. This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
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

export default Applications;
