import { useEffect, useState } from 'react';
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
} from '@chakra-ui/react';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: number;
  authUserId: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
  searchPreferences: unknown | null;
}

interface Application {
  id: number;
  userId: number;
  scholarshipName: string;
  targetType: string | null;
  organization: string | null;
  status: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const applicationsData = await apiGet<Application[]>('/applications');
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
            <Heading size="md">Your Applications</Heading>
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
              <Box overflowX="auto">
                <Table variant="simple">
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
                    {applications.map((app) => (
                      <Tr key={app.id}>
                        <Td fontWeight="medium">{app.scholarshipName}</Td>
                        <Td>{app.organization || '-'}</Td>
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
            )}
          </CardBody>
        </Card>
      </Stack>
    </Container>
  );
}

export default Dashboard;
