import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  Link as ChakraLink,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      showSuccess('Login successful', 'Welcome back!', 3000);
      navigate('/dashboard');
    } catch (error) {
      showError('Login failed', error instanceof Error ? error.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="lg" py={{ base: '8', md: '24' }} px={{ base: '4', md: '6' }}>
      <Stack spacing={{ base: '6', md: '8' }}>
        <Stack spacing="6" align="center">
          <Heading size={{ base: 'lg', md: 'xl' }}>ScholarshipHub</Heading>
          <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>Sign in to your account</Text>
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </FormControl>

                <Box textAlign="right">
                  <ChakraLink as={RouterLink} to="/forgot-password" color="blue.500" fontSize="sm">
                    Forgot password?
                  </ChakraLink>
                </Box>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  isLoading={isLoading}
                  loadingText="Signing in..."
                >
                  Sign in
                </Button>
              </Stack>
            </form>
          </CardBody>
        </Card>

        <Box textAlign="center">
          <Text>
            Don't have an account?{' '}
            <ChakraLink as={RouterLink} to="/register" color="blue.500">
              Sign up
            </ChakraLink>
          </Text>
        </Box>
      </Stack>
    </Container>
  );
}

export default Login;
