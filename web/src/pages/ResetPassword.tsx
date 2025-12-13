import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Field,
  Heading,
  Input,
  Stack,
  Text,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword, session, loading } = useAuth();
  const { showSuccess, showError } = useToastHelpers();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      showError('Passwords do not match', '', 4000);
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      showSuccess('Password updated', 'You can now sign in with your new password.', 4000);
      navigate('/login');
    } catch (error) {
      showError('Failed to update password', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasRecoverySession = Boolean(session);

  return (
    <Container maxW="lg" py={{ base: '8', md: '24' }} px={{ base: '4', md: '6' }}>
      <Stack gap={{ base: '6', md: '8' }}>
        <Stack gap="6" align="center">
          <Heading size={{ base: 'lg', md: 'xl' }}>Reset password</Heading>
          <Text color="gray.600" textAlign="center" fontSize={{ base: 'sm', md: 'md' }}>
            {hasRecoverySession
              ? 'Choose a new password for your account.'
              : 'Your reset link may have expired. Request a new password reset email to continue.'}
          </Text>
        </Stack>

        {loading ? (
          <Text textAlign="center">Preparing your reset session...</Text>
        ) : hasRecoverySession ? (
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit}>
                <Stack gap="6">
                  <Field.Root required>
                    <Field.Label>New password</Field.Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter a new password"
                    />
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label>Confirm password</Field.Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your new password"
                    />
                  </Field.Root>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    isLoading={isSubmitting}
                    loadingText="Updating..."
                  >
                    Update password
                  </Button>
                </Stack>
              </form>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <Stack gap="4">
                <Text color="gray.700">
                  The recovery session was not detected. Please request a new reset link and open it
                  again from your email.
                </Text>
                <Button as={RouterLink} to="/forgot-password" colorScheme="blue">
                  Request new link
                </Button>
              </Stack>
            </CardBody>
          </Card>
        )}

        <Box textAlign="center">
          <ChakraLink as={RouterLink} to="/login" color="blue.500">
            Back to login
          </ChakraLink>
        </Box>
      </Stack>
    </Container>
  );
}

export default ResetPassword;
