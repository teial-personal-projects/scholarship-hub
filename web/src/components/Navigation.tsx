import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  HStack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Divider,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useToastHelpers } from '../utils/toast';

/**
 * Main Navigation component
 * Displays navigation bar with logo, links, and user menu
 */
export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { showSuccess, showError } = useToastHelpers();

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Logged out', 'You have been successfully logged out.', 3000);
      navigate('/login');
    } catch (error) {
      showError('Logout failed', error instanceof Error ? error.message : 'Failed to log out');
    }
  };

  // Don't show navigation on auth pages
  if (!user || ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
    const active = isActive(to);
    return (
      <Link to={to}>
        <Box
          px="4"
          py="2"
          borderRadius="md"
          bg={active ? 'blue.400' : 'transparent'}
          borderBottom={active ? '2px solid' : 'none'}
          borderColor={active ? 'green.400' : 'transparent'}
          color="white"
          fontWeight={active ? 'semibold' : 'normal'}
          _hover={{
            bg: active ? 'blue.400' : 'blue.600',
          }}
          transition="all 0.2s"
        >
          {children}
        </Box>
      </Link>
    );
  };

  return (
    <Box bg="blue.500" boxShadow="md" position="sticky" top="0" zIndex="1000">
      <Flex
        maxW="100%"
        mx="auto"
        px={{ base: '4', md: '8' }}
        py="3"
        align="center"
        justify="space-between"
      >
        {/* Left: Logo */}
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <HStack spacing="3" cursor="pointer" _hover={{ opacity: 0.8 }}>
            <Box fontSize="2xl">🎓</Box>
            <Text fontSize="lg" fontWeight="bold" color="white">
              Scholarship Hub
            </Text>
          </HStack>
        </Link>

        {/* Center: Navigation Links */}
        <HStack spacing="1" display={{ base: 'none', md: 'flex' }}>
          <NavLink to="/dashboard">DASHBOARD</NavLink>
          <Box w="1px" h="6" bg="white" opacity="0.3" />
          <NavLink to="/collaborators">COLLABORATORS</NavLink>
          <Box w="1px" h="6" bg="white" opacity="0.3" />
          <NavLink to="/profile">PROFILE</NavLink>
        </HStack>

        {/* Right: User Menu */}
        <HStack spacing="3">
          <Menu>
            <MenuButton
              as={Box}
              cursor="pointer"
              _hover={{ opacity: 0.8 }}
            >
              <HStack spacing="2">
                <Avatar size="sm" bg="green.500" name={user.email || 'User'} />
                <Text color="white" fontWeight="medium">
                  User
                </Text>
                <Text color="white" fontSize="sm">▼</Text>
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => navigate('/profile')}>Edit Profile</MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} color="red.500">
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
}

