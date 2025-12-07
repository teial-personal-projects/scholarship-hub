import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Stack,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Link,
  Collapse,
  Button,
  useDisclosure,
  HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import type { DashboardReminders } from '@scholarship-hub/shared';

function DashboardReminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<DashboardReminders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isOpen: showApplications, onToggle: toggleApplications } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: showCollaborations, onToggle: toggleCollaborations } = useDisclosure({ defaultIsOpen: true });

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
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
      <Card>
        <CardBody>
          <Stack align="center" py="4">
            <Spinner size="lg" />
            <Text>Loading reminders...</Text>
          </Stack>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
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
      <Alert status="success">
        <AlertIcon />
        <AlertTitle>All caught up!</AlertTitle>
        <AlertDescription>No urgent items at this time.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Stack spacing="4">
      {/* Summary Badge */}
      <Card bg={hasOverdueItems ? 'red.50' : 'blue.50'} borderColor={hasOverdueItems ? 'red.200' : 'blue.200'} borderWidth="1px">
        <CardBody>
          <HStack spacing="4" flexWrap="wrap">
            {hasOverdueItems && (
              <Badge key="overdue" colorScheme="red" fontSize="md" px="3" py="1" borderRadius="full">
                {reminders.stats.totalOverdue} Overdue
              </Badge>
            )}
            {hasUpcomingItems && (
              <Badge key="upcoming" colorScheme="blue" fontSize="md" px="3" py="1" borderRadius="full">
                {reminders.stats.totalUpcoming} Due Soon
              </Badge>
            )}
          </HStack>
        </CardBody>
      </Card>

      {/* Overdue Applications */}
      {reminders.applications.overdue.length > 0 && (
        <Card borderColor="red.200" borderWidth="2px">
          <CardHeader pb="2">
            <Button
              variant="ghost"
              onClick={toggleApplications}
              width="100%"
              justifyContent="space-between"
              rightIcon={<Text>{showApplications ? '▼' : '▶'}</Text>}
            >
              <Heading size="sm" color="red.600">
                Overdue Applications ({reminders.applications.overdue.length})
              </Heading>
            </Button>
          </CardHeader>
          <Collapse in={showApplications}>
            <CardBody pt="0">
              <Stack spacing="3">
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
                          <Badge colorScheme={getUrgencyColor(daysUntilDue)} mt="1">
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
            </CardBody>
          </Collapse>
        </Card>
      )}

      {/* Applications Due Soon */}
      {reminders.applications.dueSoon.length > 0 && (
        <Card borderColor="blue.200" borderWidth="1px">
          <CardHeader pb="2">
            <Button
              variant="ghost"
              onClick={toggleApplications}
              width="100%"
              justifyContent="space-between"
              rightIcon={<Text>{showApplications ? '▼' : '▶'}</Text>}
            >
              <Heading size="sm" color="blue.600">
                Applications Due Soon ({reminders.applications.dueSoon.length})
              </Heading>
            </Button>
          </CardHeader>
          <Collapse in={showApplications}>
            <CardBody pt="0">
              <Stack spacing="3">
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
                          <Badge colorScheme={getUrgencyColor(daysUntilDue)} mt="1">
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
            </CardBody>
          </Collapse>
        </Card>
      )}

      {/* Overdue Collaborations */}
      {reminders.collaborations.overdue.length > 0 && (
        <Card borderColor="red.200" borderWidth="2px">
          <CardHeader pb="2">
            <Button
              variant="ghost"
              onClick={toggleCollaborations}
              width="100%"
              justifyContent="space-between"
              rightIcon={<Text>{showCollaborations ? '▼' : '▶'}</Text>}
            >
              <Heading size="sm" color="red.600">
                Overdue Collaborations ({reminders.collaborations.overdue.length})
              </Heading>
            </Button>
          </CardHeader>
          <Collapse in={showCollaborations}>
            <CardBody pt="0">
              <Stack spacing="3">
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
                            <Badge colorScheme="red" mt="1">
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
            </CardBody>
          </Collapse>
        </Card>
      )}

      {/* Collaborations Due Soon */}
      {reminders.collaborations.dueSoon.length > 0 && (
        <Card borderColor="blue.200" borderWidth="1px">
          <CardHeader pb="2">
            <Button
              variant="ghost"
              onClick={toggleCollaborations}
              width="100%"
              justifyContent="space-between"
              rightIcon={<Text>{showCollaborations ? '▼' : '▶'}</Text>}
            >
              <Heading size="sm" color="blue.600">
                Collaborations Due Soon ({reminders.collaborations.dueSoon.length})
              </Heading>
            </Button>
          </CardHeader>
          <Collapse in={showCollaborations}>
            <CardBody pt="0">
              <Stack spacing="3">
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
                            <Badge colorScheme={getUrgencyColor(daysUntilDue)} mt="1">
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
            </CardBody>
          </Collapse>
        </Card>
      )}
    </Stack>
  );
}

export default DashboardReminders;
