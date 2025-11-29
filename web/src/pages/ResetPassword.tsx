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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePassword, session, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Failed to update password',
        description: error instanceof Error ? error.message : 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasRecoverySession = Boolean(session);

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }}>
      <Stack spacing="8">
        <Stack spacing="6" align="center">
          <Heading size="xl">Reset password</Heading>
          <Text color="gray.600" textAlign="center">
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
                <Stack spacing="6">
                  <FormControl isRequired>
                    <FormLabel>New password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter a new password"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Confirm password</FormLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your new password"
                    />
                  </FormControl>

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
              <Stack spacing="4">
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
