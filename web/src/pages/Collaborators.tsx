import {
  Box,
  Container,
  Heading,
  Text,
  Card,
  CardBody,
} from '@chakra-ui/react';

function Collaborators() {
  return (
    <Container maxW="7xl" py={{ base: '8', md: '12' }}>
      <Card>
        <CardBody>
          <Heading size="lg" mb="4">Collaborators</Heading>
          <Text color="gray.600">
            Manage your collaborators (recommenders, essay reviewers, counselors).
          </Text>
          <Text color="gray.500" mt="4" fontSize="sm">
            This page will be implemented in Phase 6.
          </Text>
        </CardBody>
      </Card>
    </Container>
  );
}

export default Collaborators;

