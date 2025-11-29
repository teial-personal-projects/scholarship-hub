import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestPasswordReset } = useAuth();
  const toast = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      toast({
        title: 'Reset email sent',
        description: 'Check your inbox for a password reset link.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to send reset email',
        description: error instanceof Error ? error.message : 'Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }}>
      <Stack spacing="8">
        <Stack spacing="6" align="center">
          <Heading size="xl">Forgot password?</Heading>
          <Text color="gray.600" textAlign="center">
            Enter your email and we&apos;ll send you a password reset link.
          </Text>
        </Stack>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <Stack spacing="6">
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  isLoading={isSubmitting}
                  loadingText="Sending link..."
                >
                  Send reset link
                </Button>
              </Stack>
            </form>
          </CardBody>
        </Card>

        <Box textAlign="center">
          <ChakraLink as={RouterLink} to="/login" color="blue.500">
            Back to login
          </ChakraLink>
        </Box>
      </Stack>
    </Container>
  );
}

export default ForgotPassword;
