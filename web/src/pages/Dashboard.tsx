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
  VStack,
  Card,
  Spinner,
  Table,
  Badge,
  Link,
  Flex,
  IconButton,
  Tabs,
} from '@chakra-ui/react';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DashboardReminders from '../components/DashboardReminders';
import DashboardCollaborations from '../components/DashboardCollaborations';
import DashboardPendingResponses from '../components/DashboardPendingResponses';
import type { UserProfile, ApplicationResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToastHelpers();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'inProgress' | 'submitted'>('inProgress');
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
        showError('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, showError]);

  // Count applications for tabs
  const inProgressCount = useMemo(() => {
    return applications.filter(app => app.status === 'In Progress').length;
  }, [applications]);

  const submittedCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'Submitted' || app.status === 'Awarded' || app.status === 'Not Awarded'
    ).length;
  }, [applications]);

  // Filter applications by tab (must be before early returns)
  const filteredApplications = useMemo(() => {
    if (activeTab === 'inProgress') {
      // "In Progress" tab - show applications with status "In Progress"
      return applications.filter(app => app.status === 'In Progress');
    } else {
      // "Submitted" tab - show applications with status "Submitted", "Awarded", or "Not Awarded"
      return applications.filter(app => 
        app.status === 'Submitted' || app.status === 'Awarded' || app.status === 'Not Awarded'
      );
    }
  }, [applications, activeTab]);

  // Pagination calculations (must be before early returns)
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredApplications.slice(startIndex, endIndex);
  }, [filteredApplications, currentPage, itemsPerPage]);

  // Reset to page 1 when applications change or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [applications.length, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of applications section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading || loading) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Stack gap="8" align="center">
          <Spinner size="xl" />
          <Text>Loading dashboard...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="7xl" py={{ base: '8', md: '12' }}>
        <Card.Root>
          <Card.Body>
            <Text color="red.500">{error}</Text>
          </Card.Body>
        </Card.Root>
      </Container>
    );
  }

  const firstName = profile?.firstName || 'Student';

  return (
    <Box bg="gray.50" minH="100vh" pb="8">
      <Container maxW="7xl" py={{ base: '4', md: '8' }} px={{ base: '4', md: '6' }}>
        <Stack gap={{ base: '6', md: '8' }}>
          {/* Welcome Section with Quick Actions */}
          <Box
            bg="brand.500"
            borderRadius="xl"
            p={{ base: '6', md: '8' }}
            color="white"
            boxShadow="md"
          >
            <Flex
              direction={{ base: 'column', md: 'row' }}
              justify="space-between"
              align={{ base: 'start', md: 'center' }}
              gap={{ base: '4', md: '6' }}
            >
              <VStack align="start" gap="2" flex="1">
                <Heading size={{ base: 'lg', md: 'xl' }} fontWeight="bold">
                  Welcome back, {firstName}!
                </Heading>
                <Text fontSize={{ base: 'sm', md: 'md' }} opacity={0.9}>
                  {applications.length === 0
                    ? 'Get started by creating your first scholarship application'
                    : `You have ${applications.length} application${applications.length !== 1 ? 's' : ''} • ${inProgressCount} in progress`}
                </Text>
              </VStack>
              <Button
                colorPalette="blue"
                size={{ base: 'md', md: 'lg' }}
                onClick={() => navigate('/applications/new')}
                bg="white"
                _hover={{ bg: 'gray.50' }}
                color="brand.600"
                fontWeight="semibold"
                boxShadow="md"
              >
                + New Application
              </Button>
            </Flex>
          </Box>

          {/* Reminders Section */}
          <DashboardReminders />

          {/* Applications Section */}
        <Card.Root variant="elevated" bg="white">
          <Card.Header
            bg="highlight.50"
            borderTopRadius="xl"
            borderBottom="1px solid"
            borderColor="brand.200"
            py={{ base: '3', md: '4' }}
            px={{ base: '4', md: '6' }}
          >
            <Heading size="sm" color="brand.700">
              Your Applications
            </Heading>
          </Card.Header>
          <Card.Body>
            {applications.length === 0 ? (
              <Box textAlign="center" py="12">
                <Box fontSize="5xl" mb="4" color="brand.500">
                  🎓
                </Box>
                <Heading size="md" color="brand.700" mb="2">
                  Start Your Scholarship Journey
                </Heading>
                <Text color="gray.600" mb="6" maxW="md" mx="auto">
                  You don't have any applications yet. Create your first application to get started!
                </Text>
                <Button
                  colorPalette="accent"
                  size="lg"
                  onClick={() => navigate('/applications/new')}
                >
                  Create Your First Application
                </Button>
              </Box>
            ) : (
              <Tabs.Root value={activeTab} onValueChange={(details) => setActiveTab(details.value as typeof activeTab)}>
                <Tabs.List>
                  <Tabs.Trigger value="inProgress">
                    In Progress
                    {inProgressCount > 0 && (
                      <Badge ml="2" colorPalette="accent" borderRadius="full" px="2" py="0.5">
                        {inProgressCount}
                      </Badge>
                    )}
                  </Tabs.Trigger>
                  <Tabs.Trigger value="submitted">
                    Submitted
                    {submittedCount > 0 && (
                      <Badge ml="2" colorPalette="accent" borderRadius="full" px="2" py="0.5">
                        {submittedCount}
                      </Badge>
                    )}
                  </Tabs.Trigger>
                </Tabs.List>

                {/* In Progress Tab */}
                <Tabs.Content value="inProgress" px="0" pt="6">
                    {filteredApplications.length === 0 ? (
                      <Box textAlign="center" py="12">
                        <Box fontSize="5xl" mb="4" color="brand.500">
                          📝
                        </Box>
                        <Text color="gray.600">No applications in progress yet.</Text>
                      </Box>
                    ) : (
                      <Stack gap="4">
                        {/* Desktop Table View */}
                        <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                          <Table.Root size="md">
                            <Table.Header>
                              <Table.Row>
                                <Table.ColumnHeader>Scholarship Name</Table.ColumnHeader>
                                <Table.ColumnHeader>Organization</Table.ColumnHeader>
                                <Table.ColumnHeader>Status</Table.ColumnHeader>
                                <Table.ColumnHeader>Due Date</Table.ColumnHeader>
                                <Table.ColumnHeader>Actions</Table.ColumnHeader>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {paginatedApplications.map((app) => (
                                <Table.Row
                                  key={app.id}
                                  _hover={{
                                    bg: 'highlight.50',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => navigate(`/applications/${app.id}`)}
                                >
                                  <Table.Cell fontWeight="medium" color="brand.700">{app.scholarshipName}</Table.Cell>
                                  <Table.Cell color="gray.600">{app.organization || '-'}</Table.Cell>
                                  <Table.Cell>
                                    <Badge
                                      colorPalette="accent"
                                      borderRadius="full"
                                      px="3"
                                      py="1"
                                      fontWeight="semibold"
                                    >
                                      {app.status}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell color="gray.700">
                                    {app.dueDate
                                      ? new Date(app.dueDate).toLocaleDateString()
                                      : '-'}
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Link
                                      color="accent.400"
                                      fontWeight="semibold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/applications/${app.id}`);
                                      }}
                                      cursor="pointer"
                                      _hover={{ color: 'accent.500', textDecoration: 'underline' }}
                                    >
                                      View →
                                    </Link>
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Root>
                        </Box>

                        {/* Mobile Card View */}
                        <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                          {paginatedApplications.map((app) => (
                            <Card.Root
                              key={app.id}
                              cursor="pointer"
                              onClick={() => navigate(`/applications/${app.id}`)}
                              variant="outline"
                              bg="highlight.50"
                              _hover={{
                                transform: 'translateY(-2px)',
                                boxShadow: 'lg',
                              }}
                              transition="all 0.3s"
                            >
                              <Card.Body>
                                <Stack gap="3">
                                  <Flex justify="space-between" align="start">
                                    <Box flex="1">
                                      <Text fontWeight="bold" fontSize="md" mb="1" color="brand.700">
                                        {app.scholarshipName}
                                      </Text>
                                      {app.organization && (
                                        <Text fontSize="sm" color="gray.600" mb="2">
                                          {app.organization}
                                        </Text>
                                      )}
                                    </Box>
                                    <Badge
                                      colorPalette="accent"
                                      borderRadius="full"
                                      px="3"
                                      py="1"
                                      fontWeight="semibold"
                                    >
                                      {app.status}
                                    </Badge>
                                  </Flex>
                                  <HStack gap="4" fontSize="sm" color="gray.600">
                                    <Text>
                                      <Text as="span" fontWeight="semibold">Due:</Text>{' '}
                                      {app.dueDate
                                        ? new Date(app.dueDate).toLocaleDateString()
                                        : '-'}
                                    </Text>
                                  </HStack>
                                </Stack>
                              </Card.Body>
                            </Card.Root>
                          ))}
                        </Stack>

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
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              size="sm"
                            >
                              <Text aria-hidden>‹</Text>
                            </IconButton>

                            <HStack gap="1">
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
                                        colorPalette={currentPage === page ? 'accent' : 'gray'}
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
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              size="sm"
                            >
                              <Text aria-hidden>›</Text>
                            </IconButton>
                          </Flex>
                        )}
                      </Stack>
                    )}
                </Tabs.Content>

                {/* Submitted Tab */}
                <Tabs.Content value="submitted" px="0" pt="6">
                    {filteredApplications.length === 0 ? (
                      <Box textAlign="center" py="12">
                        <Box fontSize="5xl" mb="4" color="brand.500">
                          ✅
                        </Box>
                        <Text color="gray.600">No submitted applications yet.</Text>
                      </Box>
                    ) : (
                      <Stack gap="4">
                        {/* Desktop Table View */}
                        <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
                          <Table.Root size="md">
                            <Table.Header>
                              <Table.Row>
                                <Table.ColumnHeader>Scholarship Name</Table.ColumnHeader>
                                <Table.ColumnHeader>Organization</Table.ColumnHeader>
                                <Table.ColumnHeader>Status</Table.ColumnHeader>
                                <Table.ColumnHeader>Due Date</Table.ColumnHeader>
                                <Table.ColumnHeader>Actions</Table.ColumnHeader>
                              </Table.Row>
                            </Table.Header>
                            <Table.Body>
                              {paginatedApplications.map((app) => (
                                <Table.Row
                                  key={app.id}
                                  _hover={{
                                    bg: 'highlight.50',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => navigate(`/applications/${app.id}`)}
                                >
                                  <Table.Cell fontWeight="medium" color="brand.700">{app.scholarshipName}</Table.Cell>
                                  <Table.Cell color="gray.600">{app.organization || '-'}</Table.Cell>
                                  <Table.Cell>
                                    <Badge
                                      colorPalette={
                                        app.status === 'Awarded'
                                          ? 'success'
                                          : app.status === 'Submitted'
                                          ? 'success'
                                          : 'orange'
                                      }
                                      borderRadius="full"
                                      px="3"
                                      py="1"
                                      fontWeight="semibold"
                                    >
                                      {app.status}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell color="gray.700">
                                    {app.dueDate
                                      ? new Date(app.dueDate).toLocaleDateString()
                                      : '-'}
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Link
                                      color="accent.400"
                                      fontWeight="semibold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/applications/${app.id}`);
                                      }}
                                      cursor="pointer"
                                      _hover={{ color: 'accent.500', textDecoration: 'underline' }}
                                    >
                                      View →
                                    </Link>
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Root>
                        </Box>

                        {/* Mobile Card View */}
                        <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                          {paginatedApplications.map((app) => (
                            <Card.Root
                              key={app.id}
                              cursor="pointer"
                              onClick={() => navigate(`/applications/${app.id}`)}
                              variant="outline"
                              bg="highlight.50"
                              _hover={{
                                transform: 'translateY(-2px)',
                                boxShadow: 'lg',
                              }}
                              transition="all 0.3s"
                            >
                              <Card.Body>
                                <Stack gap="3">
                                  <Flex justify="space-between" align="start">
                                    <Box flex="1">
                                      <Text fontWeight="bold" fontSize="md" mb="1" color="brand.700">
                                        {app.scholarshipName}
                                      </Text>
                                      {app.organization && (
                                        <Text fontSize="sm" color="gray.600" mb="2">
                                          {app.organization}
                                        </Text>
                                      )}
                                    </Box>
                                    <Badge
                                      colorPalette={
                                        app.status === 'Awarded'
                                          ? 'success'
                                          : app.status === 'Submitted'
                                          ? 'success'
                                          : 'orange'
                                      }
                                      borderRadius="full"
                                      px="3"
                                      py="1"
                                      fontWeight="semibold"
                                    >
                                      {app.status}
                                    </Badge>
                                  </Flex>
                                  <HStack gap="4" fontSize="sm" color="gray.600">
                                    <Text>
                                      <Text as="span" fontWeight="semibold">Due:</Text>{' '}
                                      {app.dueDate
                                        ? new Date(app.dueDate).toLocaleDateString()
                                        : '-'}
                                    </Text>
                                  </HStack>
                                </Stack>
                              </Card.Body>
                            </Card.Root>
                          ))}
                        </Stack>

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
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              size="sm"
                            >
                              <Text aria-hidden>‹</Text>
                            </IconButton>

                            <HStack gap="1">
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
                                        colorPalette={currentPage === page ? 'accent' : 'gray'}
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
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              size="sm"
                            >
                              <Text aria-hidden>›</Text>
                            </IconButton>
                          </Flex>
                        )}
                      </Stack>
                    )}
                </Tabs.Content>
              </Tabs.Root>
            )}
          </Card.Body>
        </Card.Root>

          {/* Collaborations Section */}
          <DashboardCollaborations />

          {/* Pending Responses Section */}
          <DashboardPendingResponses />
      </Stack>
    </Container>
    </Box>
  );
}

export default Dashboard;
