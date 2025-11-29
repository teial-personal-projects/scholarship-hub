import {
  Box,
  Container,
  Heading,
  Text,
  Card,
  CardBody,
} from '@chakra-ui/react';

function Search() {
  return (
    <Container maxW="7xl" py={{ base: '8', md: '12' }}>
      <Card>
        <CardBody>
          <Heading size="lg" mb="4">Scholarship Search</Heading>
          <Text color="gray.600">
            Search for scholarships based on your preferences.
          </Text>
          <Text color="gray.500" mt="4" fontSize="sm">
            This page will be implemented when scholarship discovery features are added.
          </Text>
        </CardBody>
      </Card>
    </Container>
  );
}

export default Search;

