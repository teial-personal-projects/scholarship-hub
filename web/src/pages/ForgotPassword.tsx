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
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestPasswordReset } = useAuth();
  const { showSuccess, showError } = useToastHelpers();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      showSuccess('Reset email sent', 'Check your inbox for a password reset link.');
    } catch (error) {
      showError('Failed to send reset email', error instanceof Error ? error.message : 'Please try again later.');
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
