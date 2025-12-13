import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Field,
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
    <Container maxW="lg" py={{ base: '8', md: '24' }} px={{ base: '4', md: '6' }}>
      <Stack gap={{ base: '6', md: '8' }}>
        <Stack gap="6" align="center">
          <Heading size={{ base: 'lg', md: 'xl' }}>Forgot password?</Heading>
          <Text color="gray.600" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
            Enter your email and we&apos;ll send you a password reset link.
          </Text>
        </Stack>

        <Card.Root>
          <Card.Body>
            <form onSubmit={handleSubmit}>
              <Stack gap="6">
                <Field.Root required>
                  <Field.Label>Email</Field.Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </Field.Root>

                <Button
                  type="submit"
                  colorPalette="blue"
                  size="lg"
                  loading={isSubmitting}
                  loadingText="Sending link..."
                >
                  Send reset link
                </Button>
              </Stack>
            </form>
          </Card.Body>
        </Card.Root>

        <Box textAlign="center">
          <RouterLink to="/login">
            <ChakraLink color="blue.500">
              Back to login
            </ChakraLink>
          </RouterLink>
        </Box>
      </Stack>
    </Container>
  );
}

export default ForgotPassword;
