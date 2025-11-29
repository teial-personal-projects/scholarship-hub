import { useEffect, useState, useMemo } from 'react';
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
  Link,
  Flex,
  IconButton,
} from '@chakra-ui/react';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DashboardReminders from '../components/DashboardReminders';
import type { UserProfile, ApplicationResponse } from '@scholarship-hub/shared';

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const profileData = await apiGet<UserProfile>('/users/me');
        setProfile(profileData);

        // Fetch applications
        const applicationsData = await apiGet<ApplicationResponse[]>('/applications');
        setApplications(applicationsData || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
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
  }, [user, toast]);

  // Pagination calculations (must be before early returns)
  const totalPages = Math.ceil(applications.length / itemsPerPage);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return applications.slice(startIndex, endIndex);
  }, [applications, currentPage, itemsPerPage]);

  // Reset to page 1 when applications change
  useEffect(() => {
    if (applications.length > 0) {
      setCurrentPage(1);
    }
  }, [applications.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of applications section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading || loading) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Stack spacing="8" align="center">
          <Spinner size="xl" />
          <Text>Loading dashboard...</Text>
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

  const firstName = profile?.firstName || 'Student';

  return (
    <Container maxW="7xl" py={{ base: '8', md: '12' }}>
      <Stack spacing="8">
        {/* Welcome Section */}
        <Box>
          <Heading size="lg" mb="2">
            Welcome, {firstName}!
          </Heading>
          <Text color="gray.600">Here's an overview of your scholarship applications.</Text>
        </Box>

        {/* Reminders Section */}
        <DashboardReminders />

        {/* Actions */}
        <HStack spacing="4">
          <Button
            colorScheme="blue"
            onClick={() => navigate('/applications/new')}
          >
            New Application
          </Button>
        </HStack>

        {/* Applications Section */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
              <Heading size="md">Your Applications</Heading>
              {applications.length > 0 && (
                <Text color="gray.600" fontSize="sm">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-
                  {Math.min(currentPage * itemsPerPage, applications.length)} of {applications.length}
                </Text>
              )}
            </Flex>
          </CardHeader>
          <CardBody>
            {applications.length === 0 ? (
              <Box textAlign="center" py="8">
                <Text color="gray.500" mb="4">
                  You don't have any applications yet.
                </Text>
                <Button
                  colorScheme="blue"
                  onClick={() => navigate('/applications/new')}
                >
                  Create Your First Application
                </Button>
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
                            <Badge
                              colorScheme={
                                app.status === 'Submitted'
                                  ? 'green'
                                  : app.status === 'In Progress'
                                  ? 'blue'
                                  : app.status === 'Not Started'
                                  ? 'gray'
                                  : 'orange'
                              }
                            >
                              {app.status}
                            </Badge>
                          </Td>
                          <Td>
                            {app.dueDate
                              ? new Date(app.dueDate).toLocaleDateString()
                              : '-'}
                          </Td>
                          <Td>
                            <Link
                              color="blue.500"
                              onClick={() => navigate(`/applications/${app.id}`)}
                              cursor="pointer"
                            >
                              View
                            </Link>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>

                {/* Pagination Controls */}
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

                    {/* Page Numbers */}
                    <HStack spacing="1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, array) => {
                          // Add ellipsis between non-consecutive pages
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
    </Container>
  );
}

export default Dashboard;
