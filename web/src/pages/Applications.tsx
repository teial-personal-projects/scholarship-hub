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
import { useToastHelpers } from '../utils/toast';

function Applications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();
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
        showError('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [user, showError]);

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
      showSuccess('Success', 'Application deleted successfully', 3000);
      onClose();
      setDeleteId(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      showError('Error', errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
      case 'Awarded':
        return 'success';
      case 'In Progress':
        return 'accent';
      case 'Not Started':
        return 'gray';
      case 'Not Awarded':
        return 'error';
      default:
        return 'orange';
    }
  };

  if (authLoading || loading) {
    return (
      <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading applications...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
        <Card>
          <CardBody>
            <Text color="red.500">{error}</Text>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" pb="8">
      <Container maxW="7xl" py={{ base: '4', md: '8' }} px={{ base: '4', md: '6' }}>
        <Stack spacing={{ base: '6', md: '8' }}>
          {/* Header - Minimal Academic Style */}
          <Box
            bg="brand.500"
            borderRadius="xl"
            p={{ base: '6', md: '8' }}
            color="white"
            boxShadow="md"
          >
            <Flex justify="space-between" align="start" flexWrap="wrap" gap="4">
              <Box flex="1" minW="0">
                <Heading size={{ base: 'lg', md: 'xl' }} mb="2" fontWeight="bold">
                  My Scholarship Applications
                </Heading>
                <Text fontSize={{ base: 'sm', md: 'md' }} opacity={0.9}>
                  Manage all your scholarship applications in one place
                </Text>
              </Box>
              <Button
                bg="white"
                color="brand.800"
                borderWidth="1px"
                borderColor="whiteAlpha.700"
                onClick={() => navigate('/applications/new')}
                size={{ base: 'sm', md: 'md' }}
                boxShadow="sm"
                _hover={{ bg: 'whiteAlpha.900', transform: 'translateY(-1px)', boxShadow: 'md' }}
                _active={{ bg: 'whiteAlpha.800', transform: 'translateY(0px)', boxShadow: 'sm' }}
                _focusVisible={{ outline: '3px solid', outlineColor: 'whiteAlpha.800', outlineOffset: '2px' }}
              >
                New Application
              </Button>
            </Flex>
          </Box>

        {/* Filters */}
        <Card variant="academic" bg="highlight.50">
          <CardBody>
            <HStack spacing="4" flexWrap="wrap">
              <Box flex="1" minW="200px">
                <Input
                  placeholder="Search by name or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  borderColor="brand.200"
                  focusBorderColor="brand.500"
                  bg="white"
                  _hover={{ borderColor: 'brand.300' }}
                />
              </Box>
              <Box minW="150px">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  borderColor="brand.200"
                  focusBorderColor="brand.500"
                  bg="white"
                  _hover={{ borderColor: 'brand.300' }}
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
        <Card variant="academic" bg="white">
          <CardHeader
            bg="highlight.50"
            borderTopRadius="xl"
            borderBottom="1px solid"
            borderColor="brand.200"
          >
            <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
              <Heading size="md" color="brand.700">
                {filteredApplications.length} Application{filteredApplications.length !== 1 ? 's' : ''}
              </Heading>
              {filteredApplications.length > 0 && (
                <Badge colorScheme="accent" fontSize="sm" px="3" py="1" borderRadius="full">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredApplications.length)} of {filteredApplications.length}
                </Badge>
              )}
            </Flex>
          </CardHeader>
          <CardBody>
            {filteredApplications.length === 0 ? (
              <Box textAlign="center" py="12">
                <Box fontSize="5xl" mb="4" color="brand.500">
                  {searchTerm || statusFilter !== 'all' ? '🔍' : '📝'}
                </Box>
                <Heading size="md" color="brand.700" mb="2">
                  {searchTerm || statusFilter !== 'all'
                    ? 'No applications found'
                    : "Start Your Application Journey"}
                </Heading>
                <Text color="gray.600" mb="6" maxW="md" mx="auto">
                  {searchTerm || statusFilter !== 'all'
                    ? "Try adjusting your filters to see more results."
                    : "You don't have any applications yet. Create your first application to get started!"}
                </Text>
                {!searchTerm && statusFilter === 'all' && (
                  <Button
                    colorScheme="accent"
                    size="lg"
                    onClick={() => navigate('/applications/new')}
                  >
                    Create Your First Application
                  </Button>
                )}
              </Box>
            ) : (
              <Stack spacing="4">
                {/* Desktop Table View */}
                <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                  <Table variant="simple" size="md">
                    <Thead>
                      <Tr>
                        <Th>Scholarship Name</Th>
                        <Th>Organization</Th>
                        <Th>Status</Th>
                        <Th>Due Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedApplications.map((app) => (
                        <Tr
                          key={app.id}
                          _hover={{
                            bg: 'highlight.50',
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/applications/${app.id}`)}
                        >
                          <Td fontWeight="medium" color="brand.700">{app.scholarshipName}</Td>
                          <Td color="gray.600">{app.organization || '-'}</Td>
                          <Td>
                            <Badge
                              colorScheme={getStatusColor(app.status)}
                              borderRadius="full"
                              px="3"
                              py="1"
                              fontWeight="semibold"
                            >
                              {app.status}
                            </Badge>
                          </Td>
                          <Td color="gray.700">
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
                                onClick={(e) => e.stopPropagation()}
                                _hover={{ bg: 'highlight.100' }}
                              />
                              <MenuList>
                                <MenuItem onClick={() => navigate(`/applications/${app.id}`)}>
                                  View Details
                                </MenuItem>
                                <MenuItem onClick={() => navigate(`/applications/${app.id}/edit`)}>
                                  Edit
                                </MenuItem>
                                <MenuItem
                                  color="error.500"
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

                {/* Mobile Card View */}
                <Stack spacing="4" display={{ base: 'flex', md: 'none' }}>
                  {paginatedApplications.map((app) => (
                    <Card
                      key={app.id}
                      cursor="pointer"
                      onClick={() => navigate(`/applications/${app.id}`)}
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
                              <Text fontWeight="bold" fontSize="md" mb="1" color="gray.800">
                                {app.scholarshipName}
                              </Text>
                              {app.organization && (
                                <Text fontSize="sm" color="gray.600" mb="2">
                                  {app.organization}
                                </Text>
                              )}
                            </Box>
                            <Badge
                              colorScheme={getStatusColor(app.status)}
                              borderRadius="full"
                              px="3"
                              py="1"
                              fontWeight="semibold"
                            >
                              {app.status}
                            </Badge>
                          </Flex>
                          <HStack spacing="4" fontSize="sm" color="gray.600">
                            <Text>
                              <Text as="span" fontWeight="semibold">Due:</Text>{' '}
                              {app.dueDate
                                ? new Date(app.dueDate).toLocaleDateString()
                                : '-'}
                            </Text>
                          </HStack>
                          <Menu>
                            <MenuButton
                              as={Button}
                              size="sm"
                              variant="outline"
                              colorScheme="brand"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Actions
                            </MenuButton>
                            <MenuList>
                              <MenuItem onClick={() => navigate(`/applications/${app.id}`)}>
                                View Details
                              </MenuItem>
                              <MenuItem onClick={() => navigate(`/applications/${app.id}/edit`)}>
                                Edit
                              </MenuItem>
                              <MenuItem
                                color="error.500"
                                onClick={() => handleDeleteClick(app.id)}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}
                </Stack>

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
                                colorScheme={currentPage === page ? 'accent' : 'gray'}
                                variant={currentPage === page ? 'solid' : 'outline'}
                                borderRadius="md"
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
    </Box>
  );
}

export default Applications;
