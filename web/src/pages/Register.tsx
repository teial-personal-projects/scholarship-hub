import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Field,
  Heading,
  Input,
  Stack,
  Text,
  Link as ChakraLink,
  Card,
  CardBody,
  SimpleGrid,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToastHelpers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signUp(email, password, firstName, lastName);
      showSuccess('Account created', 'Your account has been created successfully. Please sign in.');
      navigate('/login');
    } catch (error) {
      showError('Registration failed', error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="lg" py={{ base: '8', md: '24' }} px={{ base: '4', md: '6' }}>
      <Stack gap={{ base: '6', md: '8' }}>
        <Stack gap="6" align="center">
          <Heading size={{ base: 'lg', md: 'xl' }}>ScholarshipHub</Heading>
          <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>Create your account</Text>
        </Stack>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <Stack gap="6">
                <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
                  <Field.Root required>
                    <Field.Label>First Name</Field.Label>
                    <Input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </Field.Root>

                  <Field.Root required>
                    <Field.Label>Last Name</Field.Label>
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </Field.Root>
                </SimpleGrid>

                <Field.Root required>
                  <Field.Label>Email</Field.Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>Password</Field.Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                  />
                  <Text fontSize="sm" color="gray.500" mt="2">
                    Password must be at least 6 characters
                  </Text>
                </Field.Root>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  isLoading={isLoading}
                  loadingText="Creating account..."
                >
                  Sign up
                </Button>
              </Stack>
            </form>
          </CardBody>
        </Card>

        <Box textAlign="center">
          <Text>
            Already have an account?{' '}
            <ChakraLink as={RouterLink} to="/login" color="blue.500">
              Sign in
            </ChakraLink>
          </Text>
        </Box>
      </Stack>
    </Container>
  );
}

export default Register;
