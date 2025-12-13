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
  CardRoot,
  CardBody,
  Spinner,
  Separator,
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
      <Stack gap={6}>
        {/* Back Button */}
        <Button
          variant="plain"
          colorPalette="blue"
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
        <CardRoot>
          <CardBody>
            <Stack gap={4}>
              {scholarship.amount && (
                <HStack>
                  <Text fontWeight="bold">💰 Amount:</Text>
                  <Badge colorPalette="green" fontSize="lg" px={3} py={1}>
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
                  <Badge colorPalette="blue">{scholarship.category}</Badge>
                </HStack>
              )}
            </Stack>
          </CardBody>
        </CardRoot>

        {/* Description */}
        {scholarship.description && (
          <CardRoot>
            <CardBody>
              <Heading size="md" mb={3}>About</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.description}</Text>
            </CardBody>
          </CardRoot>
        )}

        {/* Eligibility */}
        {scholarship.eligibility && (
          <CardRoot>
            <CardBody>
              <Heading size="md" mb={3}>Eligibility</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.eligibility}</Text>
            </CardBody>
          </CardRoot>
        )}

        {/* Requirements */}
        {scholarship.requirements && (
          <CardRoot>
            <CardBody>
              <Heading size="md" mb={3}>Requirements</Heading>
              <Text whiteSpace="pre-wrap">{scholarship.requirements}</Text>
            </CardBody>
          </CardRoot>
        )}

        {/* Actions */}
        <Stack gap={3}>
          <Separator />

          {scholarship.application_url && (
            <Button asChild colorPalette="blue" size="lg">
              <a href={scholarship.application_url} target="_blank" rel="noreferrer noopener">
                Apply on Website →
              </a>
            </Button>
          )}

          {scholarship.url && !scholarship.application_url && (
            <Button asChild colorPalette="blue" size="lg">
              <a href={scholarship.url} target="_blank" rel="noreferrer noopener">
                Visit Website →
              </a>
            </Button>
          )}

          <HStack gap={3}>
            <Button
              onClick={handleSave}
              variant="outline"
              flex="1"
            >
              Save to My Scholarships
            </Button>
            <Button
              onClick={handleCreateApplication}
              colorPalette="green"
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
