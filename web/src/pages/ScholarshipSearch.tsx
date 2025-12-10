/**
 * Scholarship Search Page
 * Allows users to search and filter scholarships
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Input,
  Select,
  Stack,
  HStack,
  Button,
  Card,
  CardBody,
  Badge,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Spinner,
  VStack,
  Flex,
} from '@chakra-ui/react';
import { apiGet, apiPost } from '../services/api';
import type { ScholarshipResponse } from '@scholarship-hub/shared';
import { useToastHelpers } from '../utils/toast';

interface ScholarshipSearchParams {
  query?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  deadlineBefore?: string;
  educationLevel?: string;
  fieldOfStudy?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

function ScholarshipSearch() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const [scholarships, setScholarships] = useState<ScholarshipResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<ScholarshipSearchParams>({
    query: '',
    category: '',
    minAmount: 0,
    maxAmount: 50000,
    educationLevel: '',
    page: 1,
    limit: 20
  });

  const [amountRange, setAmountRange] = useState([0, 50000]);

  useEffect(() => {
    searchScholarships();
  }, [searchParams.page]);

  const searchScholarships = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (searchParams.query) queryParams.set('q', searchParams.query);
      if (searchParams.category) queryParams.set('category', searchParams.category);
      if (searchParams.minAmount !== undefined) queryParams.set('minAmount', searchParams.minAmount.toString());
      if (searchParams.maxAmount !== undefined) queryParams.set('maxAmount', searchParams.maxAmount.toString());
      if (searchParams.educationLevel) queryParams.set('educationLevel', searchParams.educationLevel);
      if (searchParams.fieldOfStudy) queryParams.set('fieldOfStudy', searchParams.fieldOfStudy);
      queryParams.set('page', searchParams.page!.toString());

      const data = await apiGet<ScholarshipResponse[]>(`/scholarships/search?${queryParams}`);
      setScholarships(data);
    } catch (error) {
      showError('Error', 'Failed to search scholarships');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      minAmount: amountRange[0],
      maxAmount: amountRange[1],
      page: 1
    });
    searchScholarships();
  };

  const handleSaveScholarship = async (id: number) => {
    try {
      await apiPost(`/scholarships/${id}/save`, {});
      showSuccess('Success', 'Scholarship saved to your list');
    } catch (error) {
      showError('Error', 'Failed to save scholarship');
    }
  };

  return (
    <Container maxW="7xl" py={8}>
      <Stack spacing={8}>
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>Scholarship Search</Heading>
          <Text color="gray.600">
            Find scholarships that match your profile
          </Text>
        </Box>

        {/* Search Filters */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Keyword Search */}
              <Box>
                <Text fontWeight="semibold" mb={2}>Search</Text>
                <HStack>
                  <Input
                    placeholder="Search by name, organization, or keywords..."
                    value={searchParams.query}
                    onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                  />
                  <Button colorScheme="blue" onClick={handleSearch} minW="100px">
                    Search
                  </Button>
                </HStack>
              </Box>

              {/* Filters */}
              <HStack spacing={4} flexWrap="wrap">
                {/* Category */}
                <Box flex="1" minW="200px">
                  <Text fontWeight="semibold" mb={2}>Category</Text>
                  <Select
                    value={searchParams.category}
                    onChange={(e) => setSearchParams({ ...searchParams, category: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    <option value="STEM">STEM</option>
                    <option value="Business">Business</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Arts">Arts</option>
                    <option value="Education">Education</option>
                  </Select>
                </Box>

                {/* Education Level */}
                <Box flex="1" minW="200px">
                  <Text fontWeight="semibold" mb={2}>Education Level</Text>
                  <Select
                    value={searchParams.educationLevel}
                    onChange={(e) => setSearchParams({ ...searchParams, educationLevel: e.target.value })}
                  >
                    <option value="">All Levels</option>
                    <option value="High School">High School</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Doctorate">Doctorate</option>
                  </Select>
                </Box>
              </HStack>

              {/* Amount Range */}
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Amount: ${amountRange[0].toLocaleString()} - ${amountRange[1].toLocaleString()}
                </Text>
                <RangeSlider
                  min={0}
                  max={50000}
                  step={1000}
                  value={amountRange}
                  onChange={setAmountRange}
                >
                  <RangeSliderTrack>
                    <RangeSliderFilledTrack />
                  </RangeSliderTrack>
                  <RangeSliderThumb index={0} />
                  <RangeSliderThumb index={1} />
                </RangeSlider>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Results */}
        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner size="xl" />
          </Flex>
        ) : (
          <Stack spacing={4}>
            <Text fontWeight="semibold">
              {scholarships.length} scholarship{scholarships.length !== 1 ? 's' : ''} found
            </Text>

            {scholarships.map((scholarship) => (
              <Card key={scholarship.id} _hover={{ shadow: 'md' }} cursor="pointer">
                <CardBody>
                  <Stack spacing={3}>
                    {/* Header */}
                    <Flex justify="space-between" align="start">
                      <Box flex="1">
                        <Heading size="md" mb={1}>{scholarship.name}</Heading>
                        {scholarship.organization && (
                          <Text color="gray.600" fontSize="sm">{scholarship.organization}</Text>
                        )}
                      </Box>
                      {scholarship.amount && (
                        <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                          ${scholarship.amount.toLocaleString()}
                        </Badge>
                      )}
                    </Flex>

                    {/* Description */}
                    {scholarship.description && (
                      <Text color="gray.700" noOfLines={2}>
                        {scholarship.description}
                      </Text>
                    )}

                    {/* Meta */}
                    <HStack spacing={4} fontSize="sm" color="gray.600">
                      {scholarship.deadline && (
                        <Text>📅 Due: {new Date(scholarship.deadline).toLocaleDateString()}</Text>
                      )}
                      {scholarship.category && (
                        <Badge>{scholarship.category}</Badge>
                      )}
                      {scholarship.education_level && (
                        <Badge>{scholarship.education_level}</Badge>
                      )}
                    </HStack>

                    {/* Actions */}
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => navigate(`/scholarships/${scholarship.id}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveScholarship(scholarship.id)}
                      >
                        Save
                      </Button>
                    </HStack>
                  </Stack>
                </CardBody>
              </Card>
            ))}

            {scholarships.length === 0 && !loading && (
              <Box textAlign="center" py={12}>
                <Text color="gray.500" fontSize="lg">
                  No scholarships found. Try adjusting your filters.
                </Text>
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

export default ScholarshipSearch;
