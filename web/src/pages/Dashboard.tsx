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
  CardRoot,
  CardBody,
  CardHeader,
  Spinner,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  Badge,
  Link,
  Flex,
  IconButton,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@chakra-ui/react';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DashboardReminders from '../components/DashboardReminders';
import DashboardCollaborations from '../components/DashboardCollaborations';
import DashboardPendingResponses from '../components/DashboardPendingResponses';
import type { UserProfile, ApplicationResponse, ScholarshipResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToastHelpers();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [recommendedScholarships, setRecommendedScholarships] = useState<ScholarshipResponse[]>([]);
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

        // Fetch recommended scholarships
        try {
          const scholarshipsData = await apiGet<ScholarshipResponse[]>('/scholarships/recommended?limit=5');
          setRecommendedScholarships(scholarshipsData || []);
        } catch (scholarshipError) {
          // Don't fail the whole dashboard if scholarships fail
          console.error('Failed to fetch recommended scholarships:', scholarshipError);
        }
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
        <CardRoot>
          <CardBody>
            <Text color="red.500">{error}</Text>
          </CardBody>
        </CardRoot>
      </Container>
    );
  }

  const firstName = profile?.firstName || 'Student';

  return (
    <Box bg="gray.50" minH="100vh" pb="8">
      <Container maxW="7xl" py={{ base: '4', md: '8' }} px={{ base: '4', md: '6' }}>
        <Stack gap={{ base: '6', md: '8' }}>
          {/* Welcome Section - Minimal Academic Style */}
          <Box
            bg="brand.500"
            borderRadius="xl"
            p={{ base: '6', md: '8' }}
            color="white"
            boxShadow="md"
          >
            <VStack align="start" gap="2">
              <Heading size={{ base: 'lg', md: 'xl' }} fontWeight="bold">
                Welcome back, {firstName}!
              </Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} opacity={0.9}>
                Here's an overview of your scholarship applications
              </Text>
            </VStack>
          </Box>

          {/* Actions */}
          <HStack gap="4" flexWrap="wrap">
            <Button
              colorScheme="green"
              size={{ base: 'md', md: 'lg' }}
              onClick={() => navigate('/applications/new')}
              boxShadow="sm"
            >
              New Application
            </Button>
            <Button
              variant="outline"
              colorScheme="brand"
              size={{ base: 'md', md: 'lg' }}
              onClick={() => navigate('/search')}
            >
              Browse Scholarships
            </Button>
          </HStack>

          {/* Summary / Reminders (move to top) */}
          <DashboardReminders />

          {/* Recommended Scholarships Widget */}
          {recommendedScholarships.length > 0 && (
            <CardRoot variant="elevated" bg="white">
              <CardHeader
                bg="highlight.50"
                borderTopRadius="xl"
                borderBottom="1px solid"
                borderColor="brand.200"
                py={{ base: '3', md: '4' }}
                px={{ base: '4', md: '6' }}
              >
                <Flex justify="space-between" align="center">
                  <Heading size="sm" color="brand.700">
                    📚 New Scholarships for You
                  </Heading>
                  <Button
                    variant="plain"
                    colorPalette="brand"
                    onClick={() => navigate('/scholarships/search')}
                  >
                    Browse All →
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody>
                <Stack gap={4}>
                  {recommendedScholarships.map((scholarship) => (
                    <CardRoot
                      key={scholarship.id}
                      variant="outline"
                      _hover={{ shadow: 'sm' }}
                      cursor="pointer"
                      onClick={() => navigate(`/scholarships/${scholarship.id}`)}
                    >
                      <CardBody>
                        <Flex justify="space-between" align="start">
                          <Box flex="1">
                            <Heading size="sm" mb={1}>{scholarship.name}</Heading>
                            {scholarship.organization && (
                              <Text fontSize="sm" color="gray.600">{scholarship.organization}</Text>
                            )}
                          </Box>
                          {scholarship.amount && (
                            <Badge colorScheme="green" ml={2}>
                              ${scholarship.amount.toLocaleString()}
                            </Badge>
                          )}
                        </Flex>
                        {scholarship.deadline && (
                          <Text fontSize="sm" color="gray.500" mt={2}>
                            📅 Due: {new Date(scholarship.deadline).toLocaleDateString()}
                          </Text>
                        )}
                      </CardBody>
                    </CardRoot>
                  ))}
                </Stack>
              </CardBody>
            </CardRoot>
          )}

          {/* Applications Section */}
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
              Your Applications
            </Heading>
          </CardHeader>
          <CardBody>
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
              <TabsRoot value={activeTab} onValueChange={(details) => setActiveTab(details.value as typeof activeTab)}>
                <TabsList>
                  <TabsTrigger value="inProgress">
                    In Progress
                    {inProgressCount > 0 && (
                      <Badge ml="2" colorScheme="accent" borderRadius="full" px="2" py="0.5">
                        {inProgressCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="submitted">
                    Submitted
                    {submittedCount > 0 && (
                      <Badge ml="2" colorScheme="accent" borderRadius="full" px="2" py="0.5">
                        {submittedCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* In Progress Tab */}
                <TabsContent value="inProgress" px="0" pt="6">
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
                          <TableRoot size="md">
                            <TableHeader>
                              <TableRow>
                                <TableColumnHeader>Scholarship Name</TableColumnHeader>
                                <TableColumnHeader>Organization</TableColumnHeader>
                                <TableColumnHeader>Status</TableColumnHeader>
                                <TableColumnHeader>Due Date</TableColumnHeader>
                                <TableColumnHeader>Actions</TableColumnHeader>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedApplications.map((app) => (
                                <TableRow
                                  key={app.id}
                                  _hover={{
                                    bg: 'highlight.50',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => navigate(`/applications/${app.id}`)}
                                >
                                  <TableCell fontWeight="medium" color="brand.700">{app.scholarshipName}</TableCell>
                                  <TableCell color="gray.600">{app.organization || '-'}</TableCell>
                                  <TableCell>
                                    <Badge
                                      colorScheme="accent"
                                      borderRadius="full"
                                      px="3"
                                      py="1"
                                      fontWeight="semibold"
                                    >
                                      {app.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell color="gray.700">
                                    {app.dueDate
                                      ? new Date(app.dueDate).toLocaleDateString()
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
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
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </TableRoot>
                        </Box>

                        {/* Mobile Card View */}
                        <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                          {paginatedApplications.map((app) => (
                            <CardRoot
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
                              <CardBody>
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
                                      colorScheme="accent"
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
                              </CardBody>
                            </CardRoot>
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
                </TabsContent>

                {/* Submitted Tab */}
                <TabsContent value="submitted" px="0" pt="6">
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
                          <TableRoot size="md">
                            <TableHeader>
                              <TableRow>
                                <TableColumnHeader>Scholarship Name</TableColumnHeader>
                                <TableColumnHeader>Organization</TableColumnHeader>
                                <TableColumnHeader>Status</TableColumnHeader>
                                <TableColumnHeader>Due Date</TableColumnHeader>
                                <TableColumnHeader>Actions</TableColumnHeader>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedApplications.map((app) => (
                                <TableRow
                                  key={app.id}
                                  _hover={{
                                    bg: 'highlight.50',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => navigate(`/applications/${app.id}`)}
                                >
                                  <TableCell fontWeight="medium" color="brand.700">{app.scholarshipName}</TableCell>
                                  <TableCell color="gray.600">{app.organization || '-'}</TableCell>
                                  <TableCell>
                                    <Badge
                                      colorScheme={
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
                                  </TableCell>
                                  <TableCell color="gray.700">
                                    {app.dueDate
                                      ? new Date(app.dueDate).toLocaleDateString()
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
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
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </TableRoot>
                        </Box>

                        {/* Mobile Card View */}
                        <Stack gap="4" display={{ base: 'flex', md: 'none' }}>
                          {paginatedApplications.map((app) => (
                            <CardRoot
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
                              <CardBody>
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
                                      colorScheme={
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
                              </CardBody>
                            </CardRoot>
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
                </TabsContent>
              </TabsRoot>
            )}
          </CardBody>
        </CardRoot>

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
