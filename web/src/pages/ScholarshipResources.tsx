import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  CardRoot,
  CardBody,
  CardHeader,
  Spinner,
  Badge,
  Flex,
  HStack,
  VStack,
  Link,
  SimpleGrid,
} from '@chakra-ui/react';
import { LuExternalLink, LuTag } from 'react-icons/lu';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

interface ScholarshipResource {
  id: number;
  name: string;
  displayName?: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  requiresAuth?: boolean;
  isFree?: boolean;
  logoUrl?: string;
}

function ScholarshipResources() {
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToastHelpers();

  const [resources, setResources] = useState<ScholarshipResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchResources() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<ScholarshipResource[]>('/resources');
        setResources(data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load resources';
        setError(errorMessage);
        showError('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchResources();
    }
  }, [user, authLoading, showError]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = new Set<string>();
    resources.forEach((resource) => {
      if (resource.category) {
        cats.add(resource.category);
      }
    });
    return Array.from(cats).sort();
  }, [resources]);

  // Filter resources by category
  const filteredResources = useMemo(() => {
    if (categoryFilter === 'all') {
      return resources;
    }
    return resources.filter((resource) => resource.category === categoryFilter);
  }, [resources, categoryFilter]);

  if (authLoading || loading) {
    return (
      <Container maxW="container.xl" py="8">
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="xl" />
        </Flex>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py="8">
        <Box
          p="6"
          borderRadius="md"
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          color="red.800"
        >
          <Text fontWeight="bold" mb="2">
            Error loading resources
          </Text>
          <Text>{error}</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py="8">
      <VStack gap="6" align="stretch">
        {/* Header */}
        <Box>
          <Heading size="xl" mb="2">
            Scholarship Resources
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Discover trusted websites and organizations to help you find scholarship opportunities
          </Text>
        </Box>

        {/* Category Filter */}
        {categories.length > 0 && (
          <HStack gap="2" flexWrap="wrap">
            <Badge
              px="3"
              py="1"
              borderRadius="full"
              cursor="pointer"
              bg={categoryFilter === 'all' ? 'brand.500' : 'gray.200'}
              color={categoryFilter === 'all' ? 'white' : 'gray.700'}
              onClick={() => setCategoryFilter('all')}
              _hover={{ opacity: 0.8 }}
            >
              All
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                px="3"
                py="1"
                borderRadius="full"
                cursor="pointer"
                bg={categoryFilter === category ? 'brand.500' : 'gray.200'}
                color={categoryFilter === category ? 'white' : 'gray.700'}
                onClick={() => setCategoryFilter(category)}
                _hover={{ opacity: 0.8 }}
              >
                {category}
              </Badge>
            ))}
          </HStack>
        )}

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <Box
            p="8"
            borderRadius="md"
            bg="gray.50"
            border="1px solid"
            borderColor="gray.200"
            textAlign="center"
          >
            <Text color="gray.600">
              {categoryFilter === 'all'
                ? 'No resources available at this time.'
                : `No resources found in the "${categoryFilter}" category.`}
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6">
            {filteredResources.map((resource) => (
              <CardRoot key={resource.id} size="lg" variant="outline">
                <CardHeader>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" gap="1" flex="1">
                      <Heading size="md">{resource.displayName || resource.name}</Heading>
                      {resource.category && (
                        <Badge colorScheme="blue" size="sm">
                          {resource.category}
                        </Badge>
                      )}
                    </VStack>
                    {resource.logoUrl && (
                      <Box
                        as="img"
                        src={resource.logoUrl}
                        alt={`${resource.displayName || resource.name} logo`}
                        boxSize="48px"
                        objectFit="contain"
                        borderRadius="sm"
                      />
                    )}
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack gap="3" align="stretch">
                    {resource.description && (
                      <Text color="gray.600" fontSize="sm">
                        {resource.description}
                      </Text>
                    )}

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                      <HStack gap="1" flexWrap="wrap">
                        <LuTag size={14} />
                        {resource.tags.map((tag, idx) => (
                          <Badge key={idx} variant="subtle" colorScheme="gray" size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </HStack>
                    )}

                    {/* Metadata */}
                    <HStack gap="2" fontSize="sm" color="gray.500">
                      {resource.isFree !== false && (
                        <Badge variant="subtle" colorScheme="green" size="sm">
                          Free
                        </Badge>
                      )}
                      {resource.requiresAuth && (
                        <Badge variant="subtle" colorScheme="orange" size="sm">
                          Account Required
                        </Badge>
                      )}
                    </HStack>

                    {/* Link */}
                    <Link
                      href={resource.url.startsWith('http') ? resource.url : `https://${resource.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      isExternal
                      mt="2"
                    >
                      <HStack
                        gap="2"
                        color="brand.500"
                        fontWeight="medium"
                        _hover={{ color: 'brand.600', textDecoration: 'underline' }}
                      >
                        <Text>Visit Website</Text>
                        <LuExternalLink size={16} />
                      </HStack>
                    </Link>
                  </VStack>
                </CardBody>
              </CardRoot>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}

export default ScholarshipResources;
