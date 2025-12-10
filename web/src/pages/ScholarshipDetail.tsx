/**
 * Scholarship Detail Page
 * Displays full details of a scholarship
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  HStack,
  Button,
  Badge,
  Card,
  CardBody,
  Spinner,
  Link as ChakraLink,
  Divider,
} from '@chakra-ui/react';
import { apiGet, apiPost } from '../services/api';
import type { ScholarshipResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

function ScholarshipDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const [scholarship, setScholarship] = useState<ScholarshipResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScholarship();
  }, [id]);

  const fetchScholarship = async () => {
    try {
      setLoading(true);
      const data = await apiGet<ScholarshipResponse>(`/scholarships/${id}`);
      setScholarship(data);
    } catch (error) {
      showError('Error', 'Failed to load scholarship');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!scholarship) return;

    try {
      await apiPost(`/scholarships/${scholarship.id}/save`, {});
      showSuccess('Success', 'Scholarship saved to your list');
    } catch (error) {
      showError('Error', 'Failed to save scholarship');
    }
  };

  const handleCreateApplication = () => {
    navigate('/applications/new', {
      state: { scholarshipName: scholarship?.name }
    });
  };

  if (loading) {
    return (
      <Container maxW="4xl" py={12} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading scholarship...</Text>
      </Container>
    );
  }

  if (!scholarship) {
    return (
      <Container maxW="4xl" py={12} textAlign="center">
        <Text color="red.500">Scholarship not found</Text>
        <Button mt={4} onClick={() => navigate('/scholarships/search')}>
          Back to Search
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={8}>
      <Stack spacing={6}>
        {/* Back Button */}
        <Button
          variant="link"
          colorScheme="blue"
          onClick={() => navigate(-1)}
          alignSelf="flex-start"
        >
          ← Back
        </Button>

        {/* Header */}
        <Box>
          <Heading size="xl" mb={2}>{scholarship.name}</Heading>
          {scholarship.organization && (
            <Text fontSize="lg" color="gray.600">{scholarship.organization}</Text>
          )}
        </Box>

        {/* Key Info */}
        <Card>
          <CardBody>
            <Stack spacing={4}>
              {scholarship.amount && (
                <HStack>
                  <Text fontWeight="bold">💰 Amount:</Text>
                  <Badge colorScheme="green" fontSize="lg" px={3} py={1}>
                    ${scholarship.amount.toLocaleString()}
                  </Badge>
                </HStack>
              )}

              {scholarship.deadline && (
                <HStack>
                  <Text fontWeight="bold">📅 Deadline:</Text>
                  <Text>{new Date(scholarship.deadline).toLocaleDateString()}</Text>
                </HStack>
              )}

              {scholarship.education_level && (
                <HStack>
                  <Text fontWeight="bold">🎓 Level:</Text>
                  <Badge>{scholarship.education_level}</Badge>
                </HStack>
              )}

              {scholarship.field_of_study && (
                <HStack>
                  <Text fontWeight="bold">📚 Field:</Text>
                  <Text>{scholarship.field_of_study}</Text>
                </HStack>
              )}

              {scholarship.category && (
                <HStack>
                  <Text fontWeight="bold">🏷️ Category:</Text>
                  <Badge colorScheme="blue">{scholarship.category}</Badge>
                </HStack>
              )}
            </Stack>
          </CardBody>
        </Card>

        {/* Description */}
        {scholarship.description && (
          <Card>
            <CardBody>
              <Heading size="md" mb={3}>About</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.description}</Text>
            </CardBody>
          </Card>
        )}

        {/* Eligibility */}
        {scholarship.eligibility && (
          <Card>
            <CardBody>
              <Heading size="md" mb={3}>Eligibility</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.eligibility}</Text>
            </CardBody>
          </Card>
        )}

        {/* Requirements */}
        {scholarship.requirements && (
          <Card>
            <CardBody>
              <Heading size="md" mb={3}>Requirements</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.requirements}</Text>
            </CardBody>
          </Card>
        )}

        {/* Actions */}
        <Stack spacing={3}>
          <Divider />

          {scholarship.application_url && (
            <Button
              as={ChakraLink}
              href={scholarship.application_url}
              isExternal
              colorScheme="blue"
              size="lg"
            >
              Apply on Website →
            </Button>
          )}

          {scholarship.url && !scholarship.application_url && (
            <Button
              as={ChakraLink}
              href={scholarship.url}
              isExternal
              colorScheme="blue"
              size="lg"
            >
              Visit Website →
            </Button>
          )}

          <HStack spacing={3}>
            <Button
              onClick={handleSave}
              variant="outline"
              flex="1"
            >
              Save to My Scholarships
            </Button>
            <Button
              onClick={handleCreateApplication}
              colorScheme="green"
              flex="1"
            >
              Create Application
            </Button>
          </HStack>
        </Stack>
      </Stack>
    </Container>
  );
}

export default ScholarshipDetail;
