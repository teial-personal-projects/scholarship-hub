import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Heading,
  Text,
  Stack,
  Badge,
  Alert,
  Spinner,
  Link,
  Collapsible,
  Button,
  useDisclosure,
  HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import type { DashboardReminders } from '@scholarship-hub/shared';
import { parseDateOnlyToLocalDate } from '../utils/date';

function DashboardReminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<DashboardReminders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { open: showApplications, onToggle: toggleApplications } = useDisclosure({ defaultOpen: true });
  const { open: showCollaborations, onToggle: toggleCollaborations } = useDisclosure({ defaultOpen: true });

  useEffect(() => {
    async function fetchReminders() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<DashboardReminders>('/users/me/reminders');
        setReminders(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load reminders';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchReminders();
  }, []);

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Avoid timezone shift for DATE strings (YYYY-MM-DD)
    const due = dueDate.includes('T') ? new Date(dueDate) : parseDateOnlyToLocalDate(dueDate);
    const dueDateObj = due ?? new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);

    const diffTime = dueDateObj.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (daysUntilDue: number): string => {
    if (daysUntilDue < 0) return 'red';
    if (daysUntilDue <= 3) return 'orange';
    if (daysUntilDue <= 7) return 'blue';
    return 'gray';
  };

  const formatDaysText = (daysUntilDue: number): string => {
    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      return `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`;
    }
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `${daysUntilDue} days until due`;
  };

  if (loading) {
    return (
      <Card.Root>
        <Card.Body>
          <Stack align="center" py="4">
            <Spinner size="lg" />
            <Text>Loading reminders...</Text>
          </Stack>
        </Card.Body>
      </Card.Root>
    );
  }

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    );
  }

  if (!reminders) {
    return null;
  }

  const hasOverdueItems = reminders.stats.totalOverdue > 0;
  const hasUpcomingItems = reminders.stats.totalUpcoming > 0;

  // If no reminders, show positive message
  if (!hasOverdueItems && !hasUpcomingItems) {
    return (
      <Alert.Root status="success">
        <Alert.Indicator />
        <Alert.Title>All caught up!</Alert.Title>
        <Alert.Description>No urgent items at this time.</Alert.Description>
      </Alert.Root>
    );
  }

  return (
    <Stack gap="4">
      {/* Summary Badge */}
      <Card.Root bg={hasOverdueItems ? 'red.50' : 'blue.50'} borderColor={hasOverdueItems ? 'red.200' : 'blue.200'} borderWidth="1px">
        <Card.Body>
          <HStack gap="4" flexWrap="wrap">
            {hasOverdueItems && (
              <Badge key="overdue" colorPalette="red" fontSize="md" px="3" py="1" borderRadius="full">
                {reminders.stats.totalOverdue} Overdue
              </Badge>
            )}
            {hasUpcomingItems && (
              <Badge key="upcoming" colorPalette="blue" fontSize="md" px="3" py="1" borderRadius="full">
                {reminders.stats.totalUpcoming} Due Soon
              </Badge>
            )}
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Overdue Applications */}
      {reminders.applications.overdue.length > 0 && (
        <Card.Root borderColor="red.200" borderWidth="2px">
          <Card.Header pb="2">
            <Button
              variant="ghost"
              onClick={toggleApplications}
              width="100%"
              justifyContent="space-between"
            >
              <Heading size="sm" color="red.600">
                Overdue Applications ({reminders.applications.overdue.length})
              </Heading>
              <Text>{showApplications ? '▼' : '▶'}</Text>
            </Button>
          </Card.Header>
          <Collapsible.Root open={showApplications}>
            <Collapsible.Content>
            <Card.Body pt="0">
              <Stack gap="3">
                {reminders.applications.overdue.map((app) => {
                  const daysUntilDue = getDaysUntilDue(app.dueDate);
                  return (
                    <Box
                      key={app.id}
                      p="3"
                      bg="red.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="red.200"
                    >
                      <HStack justify="space-between" flexWrap="wrap" gap="2">
                        <Box flex="1">
                          <Text fontWeight="medium">{app.scholarshipName}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {app.organization || 'Organization not specified'}
                          </Text>
                          <Badge colorPalette={getUrgencyColor(daysUntilDue)} mt="1">
                            {formatDaysText(daysUntilDue)}
                          </Badge>
                        </Box>
                        <Link
                          color="blue.500"
                          fontSize="sm"
                          onClick={() => navigate(`/applications/${app.id}`)}
                          cursor="pointer"
                        >
                          View Application
                        </Link>
                      </HStack>
                    </Box>
                  );
                })}
              </Stack>
            </Card.Body>
            </Collapsible.Content>
          </Collapsible.Root>
        </Card.Root>
      )}

      {/* Applications Due Soon */}
      {reminders.applications.dueSoon.length > 0 && (
        <Card.Root borderColor="blue.200" borderWidth="1px">
          <Card.Header pb="2">
            <Button
              variant="ghost"
              onClick={toggleApplications}
              width="100%"
              justifyContent="space-between"
            >
              <Heading size="sm" color="blue.600">
                Applications Due Soon ({reminders.applications.dueSoon.length})
              </Heading>
              <Text>{showApplications ? '▼' : '▶'}</Text>
            </Button>
          </Card.Header>
          <Collapsible.Root open={showApplications}>
            <Collapsible.Content>
            <Card.Body pt="0">
              <Stack gap="3">
                {reminders.applications.dueSoon.map((app) => {
                  const daysUntilDue = getDaysUntilDue(app.dueDate);
                  return (
                    <Box
                      key={app.id}
                      p="3"
                      bg="blue.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="blue.200"
                    >
                      <HStack justify="space-between" flexWrap="wrap" gap="2">
                        <Box flex="1">
                          <Text fontWeight="medium">{app.scholarshipName}</Text>
                          <Text fontSize="sm" color="gray.600">
                            {app.organization || 'Organization not specified'}
                          </Text>
                          <Badge colorPalette={getUrgencyColor(daysUntilDue)} mt="1">
                            {formatDaysText(daysUntilDue)}
                          </Badge>
                        </Box>
                        <Link
                          color="blue.500"
                          fontSize="sm"
                          onClick={() => navigate(`/applications/${app.id}`)}
                          cursor="pointer"
                        >
                          View Application
                        </Link>
                      </HStack>
                    </Box>
                  );
                })}
              </Stack>
            </Card.Body>
            </Collapsible.Content>
          </Collapsible.Root>
        </Card.Root>
      )}

      {/* Overdue Collaborations */}
      {reminders.collaborations.overdue.length > 0 && (
        <Card.Root borderColor="red.200" borderWidth="2px">
          <Card.Header pb="2">
            <Button
              variant="ghost"
              onClick={toggleCollaborations}
              width="100%"
              justifyContent="space-between"
            >
              <Heading size="sm" color="red.600">
                Overdue Collaborations ({reminders.collaborations.overdue.length})
              </Heading>
              <Text>{showCollaborations ? '▼' : '▶'}</Text>
            </Button>
          </Card.Header>
          <Collapsible.Root open={showCollaborations}>
            <Collapsible.Content>
            <Card.Body pt="0">
              <Stack gap="3">
                {reminders.collaborations.overdue.map((collab) => {
                  const daysUntilDue = collab.nextActionDueDate ? getDaysUntilDue(collab.nextActionDueDate) : null;
                  return (
                    <Box
                      key={collab.id}
                      p="3"
                      bg="red.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="red.200"
                    >
                      <HStack justify="space-between" flexWrap="wrap" gap="2">
                        <Box flex="1">
                          <Text fontWeight="medium">
                            {collab.collaborationType === 'recommendation' && 'Recommendation'}
                            {collab.collaborationType === 'essayReview' && 'Essay Review'}
                            {collab.collaborationType === 'guidance' && 'Guidance Session'}
                          </Text>
                          {daysUntilDue !== null && (
                            <Badge colorPalette="red" mt="1">
                              {formatDaysText(daysUntilDue)}
                            </Badge>
                          )}
                        </Box>
                        <Link
                          color="blue.500"
                          fontSize="sm"
                          onClick={() => navigate(`/collaborations/${collab.id}`)}
                          cursor="pointer"
                        >
                          View Details
                        </Link>
                      </HStack>
                    </Box>
                  );
                })}
              </Stack>
            </Card.Body>
            </Collapsible.Content>
          </Collapsible.Root>
        </Card.Root>
      )}

      {/* Collaborations Due Soon */}
      {reminders.collaborations.dueSoon.length > 0 && (
        <Card.Root borderColor="blue.200" borderWidth="1px">
          <Card.Header pb="2">
            <Button
              variant="ghost"
              onClick={toggleCollaborations}
              width="100%"
              justifyContent="space-between"
            >
              <Heading size="sm" color="blue.600">
                Collaborations Due Soon ({reminders.collaborations.dueSoon.length})
              </Heading>
              <Text>{showCollaborations ? '▼' : '▶'}</Text>
            </Button>
          </Card.Header>
          <Collapsible.Root open={showCollaborations}>
            <Collapsible.Content>
            <Card.Body pt="0">
              <Stack gap="3">
                {reminders.collaborations.dueSoon.map((collab) => {
                  const daysUntilDue = collab.nextActionDueDate ? getDaysUntilDue(collab.nextActionDueDate) : null;
                  return (
                    <Box
                      key={collab.id}
                      p="3"
                      bg="blue.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="blue.200"
                    >
                      <HStack justify="space-between" flexWrap="wrap" gap="2">
                        <Box flex="1">
                          <Text fontWeight="medium">
                            {collab.collaborationType === 'recommendation' && 'Recommendation'}
                            {collab.collaborationType === 'essayReview' && 'Essay Review'}
                            {collab.collaborationType === 'guidance' && 'Guidance Session'}
                          </Text>
                          {daysUntilDue !== null && (
                            <Badge colorPalette={getUrgencyColor(daysUntilDue)} mt="1">
                              {formatDaysText(daysUntilDue)}
                            </Badge>
                          )}
                        </Box>
                        <Link
                          color="blue.500"
                          fontSize="sm"
                          onClick={() => navigate(`/collaborations/${collab.id}`)}
                          cursor="pointer"
                        >
                          View Details
                        </Link>
                      </HStack>
                    </Box>
                  );
                })}
              </Stack>
            </Card.Body>
            </Collapsible.Content>
          </Collapsible.Root>
        </Card.Root>
      )}
    </Stack>
  );
}

export default DashboardReminders;
