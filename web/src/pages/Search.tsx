import {
  Container,
  Heading,
  Text,
  Card,
} from '@chakra-ui/react';

function Search() {
  return (
    <Container maxW="7xl" py={{ base: '4', md: '12' }} px={{ base: '4', md: '6' }}>
      <Card.Root>
        <Card.Body>
          <Heading size={{ base: 'md', md: 'lg' }} mb="4">Scholarship Search</Heading>
          <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
            Search for scholarships based on your preferences.
          </Text>
          <Text color="gray.500" mt="4" fontSize="sm">
            This page will be implemented when scholarship discovery features are added.
          </Text>
        </Card.Body>
      </Card.Root>
    </Container>
  );
}

export default Search;

