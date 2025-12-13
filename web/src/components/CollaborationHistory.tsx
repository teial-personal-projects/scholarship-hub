/**
 * CollaborationHistory Component
 * Displays timeline of collaboration history actions
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Separator,
} from '@chakra-ui/react';
import { useCollaborationHistory } from '../hooks/useCollaborations';
import { formatRelativeTimestamp } from '../utils/date';

interface CollaborationHistoryProps {
  collaborationId: number;
  /**
   * Optional: if rendered inside a modal/drawer, pass isOpen so we refetch
   * whenever it becomes visible (avoids stale timeline).
   */
  isOpen?: boolean;
}

const CollaborationHistory: React.FC<CollaborationHistoryProps> = ({ collaborationId, isOpen }) => {
  // Use React Query - it automatically refetches when collaborationId changes
  // and when the query is invalidated (e.g., after updating the collaboration)
  const { data: history = [], isLoading: loading } = useCollaborationHistory(
    isOpen === false ? null : collaborationId
  );

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'invited':
        return 'Invitation Sent';
      case 'reminder_sent':
        return 'Reminder Sent';
      case 'viewed':
        return 'Invitation Viewed';
      case 'accepted':
        return 'Invitation Accepted';
      case 'declined':
        return 'Invitation Declined';
      case 'in_progress':
        return 'Marked In Progress';
      case 'submitted':
        return 'Submitted';
      case 'completed':
        return 'Marked Completed';
      case 'comment_added':
        return 'Comment Added';
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'accepted':
      case 'submitted':
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'blue';
      case 'invited':
      case 'reminder_sent':
        return 'purple';
      case 'viewed':
        return 'cyan';
      case 'declined':
        return 'red';
      case 'comment_added':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'invited':
        return '📧';
      case 'reminder_sent':
        return '🔔';
      case 'viewed':
        return '👁️';
      case 'accepted':
        return '✅';
      case 'declined':
        return '❌';
      case 'in_progress':
        return '🚀';
      case 'submitted':
      case 'completed':
        return '🎉';
      case 'comment_added':
        return '💬';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => formatRelativeTimestamp(timestamp, 'N/A');

  if (loading) {
    return (
      <Box textAlign="center" py={4}>
        <Spinner size="md" />
        <Text fontSize="sm" color="gray.500" mt={2}>
          Loading history...
        </Text>
      </Box>
    );
  }

  if (history.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
        No history available
      </Text>
    );
  }

  return (
    <VStack align="stretch" gap={0}>
      {history.map((entry, index) => (
        <Box key={entry.id}>
          <HStack align="flex-start" gap={3} py={3}>
            {/* Icon/Timeline Marker */}
            <Box position="relative">
              <Box
                fontSize="xl"
                width="40px"
                height="40px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={`${getActionColor(entry.action)}.50`}
                borderRadius="full"
                border="2px solid"
                borderColor={`${getActionColor(entry.action)}.200`}
              >
                {getActionIcon(entry.action)}
              </Box>
              {/* Timeline Line */}
              {index < history.length - 1 && (
                <Box
                  position="absolute"
                  left="50%"
                  top="45px"
                  width="2px"
                  height="calc(100% + 10px)"
                  bg="gray.200"
                  transform="translateX(-50%)"
                />
              )}
            </Box>

            {/* Content */}
            <Box flex="1">
              <HStack justify="space-between" align="flex-start" mb={1}>
                <Badge colorPalette={getActionColor(entry.action)} fontSize="xs">
                  {getActionLabel(entry.action)}
                </Badge>
                <Text fontSize="xs" color="gray.500">
                  {formatTimestamp(entry.createdAt)}
                </Text>
              </HStack>
              {entry.details && (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {entry.details}
                </Text>
              )}
              <Text fontSize="xs" color="gray.400" mt={1}>
                {new Date(entry.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </Box>
          </HStack>
          {index < history.length - 1 && <Separator />}
        </Box>
      ))}
    </VStack>
  );
};

export default CollaborationHistory;
