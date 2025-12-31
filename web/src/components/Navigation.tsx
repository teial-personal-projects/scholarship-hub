import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  HStack,
  Image,
  Text,
  MenuRoot,
  MenuTrigger,
  MenuPositioner,
  MenuContent,
  MenuItem,
  AvatarRoot,
  AvatarFallback,
  IconButton,
  DrawerRoot,
  DrawerBody,
  DrawerHeader,
  DrawerBackdrop,
  DrawerPositioner,
  DrawerContent,
  DrawerCloseTrigger,
  VStack,
  Separator,
  useDisclosure,
} from '@chakra-ui/react';
// Hamburger icon - using text symbol for simplicity
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
  const { open: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose, setOpen: setDrawerOpen } = useDisclosure();

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

  const NavLink = ({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) => {
    const active = isActive(to);
    return (
      <Link to={to} onClick={onClick}>
        <Box
          px="4"
          py="2"
          borderRadius="md"
          bg={active ? 'whiteAlpha.300' : 'transparent'}
          borderBottom={active ? '3px solid' : 'none'}
          borderColor={active ? 'white' : 'transparent'}
          color="white"
          fontWeight={active ? 'bold' : 'normal'}
          _hover={{
            bg: 'whiteAlpha.200',
            transform: 'translateY(-1px)',
          }}
          transition="all 0.2s"
          w="100%"
          textAlign="left"
        >
          {children}
        </Box>
      </Link>
    );
  };


  return (
    <>
      <Box
        bg="brand.500"
        boxShadow="md"
        position="sticky"
        top="0"
        zIndex="1000"
      >
        <Flex
          maxW="100%"
          mx="auto"
          px={{ base: '4', md: '8' }}
          py="3"
          align="center"
          justify="space-between"
        >
          {/* Left: Logo and Mobile Menu Button */}
          <HStack gap="3">
            {/* Mobile Hamburger Menu */}
            <IconButton
              aria-label="Open menu"
              variant="ghost"
              color="white"
              display={{ base: 'flex', md: 'none' }}
              onClick={onDrawerOpen}
            >
              <Text aria-hidden fontSize="xl">
                ☰
              </Text>
            </IconButton>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <HStack gap="3" cursor="pointer" _hover={{ opacity: 0.9, transform: 'scale(1.02)' }} transition="all 0.2s">
                <Image
                  src="/favicon.ico"
                  alt="Scholarship Hub"
                  boxSize={{ base: '24px', md: '28px' }}
                  borderRadius="sm"
                />
                <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold" color="white">
                  Scholarship Hub
                </Text>
              </HStack>
            </Link>
          </HStack>

          {/* Center: Navigation Links (Desktop) */}
          <HStack gap="1" display={{ base: 'none', md: 'flex' }}>
            <NavLink to="/dashboard">DASHBOARD</NavLink>
            <Box w="1px" h="6" bg="white" opacity="0.3" />
            <NavLink to="/collaborators">COLLABORATORS</NavLink>
            <Box w="1px" h="6" bg="white" opacity="0.3" />
            <NavLink to="/resources">RESOURCES</NavLink>
            <Box w="1px" h="6" bg="white" opacity="0.3" />
            <NavLink to="/profile">PROFILE</NavLink>
          </HStack>

          {/* Right: User Menu */}
          <HStack gap="3">
            <MenuRoot>
              <MenuTrigger asChild>
                <Box cursor="pointer" _hover={{ opacity: 0.8 }}>
                  <HStack gap="2">
                    <AvatarRoot size="sm" bg="accent.400">
                      <AvatarFallback name={user.email || 'User'} />
                    </AvatarRoot>
                    <Text color="white" fontWeight="medium" display={{ base: 'none', md: 'block' }}>
                      User
                    </Text>
                    <Text color="white" fontSize="sm" display={{ base: 'none', md: 'block' }}>
                      ▼
                    </Text>
                  </HStack>
                </Box>
              </MenuTrigger>
              <MenuPositioner>
                <MenuContent>
                  <MenuItem value="profile" onClick={() => navigate('/profile')}>
                    Edit Profile
                  </MenuItem>
                  <Box my="1">
                    <Separator />
                  </Box>
                  <MenuItem value="logout" onClick={handleLogout} color="red.500">
                    Logout
                  </MenuItem>
                </MenuContent>
              </MenuPositioner>
            </MenuRoot>
          </HStack>
        </Flex>
      </Box>

      {/* Mobile Drawer Menu */}
      <DrawerRoot open={isDrawerOpen} onOpenChange={(details) => setDrawerOpen(details.open)}>
        <DrawerBackdrop />
        <DrawerPositioner>
          <DrawerContent bg="brand.500">
            <DrawerCloseTrigger color="white" />
            <DrawerHeader>
              <Text color="white" fontSize="lg" fontWeight="bold">
                Menu
              </Text>
            </DrawerHeader>
            <DrawerBody>
              <VStack gap="2" align="stretch" mt="4">
                <NavLink to="/dashboard" onClick={onDrawerClose}>DASHBOARD</NavLink>
                <NavLink to="/collaborators" onClick={onDrawerClose}>COLLABORATORS</NavLink>
                <NavLink to="/resources" onClick={onDrawerClose}>RESOURCES</NavLink>
                <NavLink to="/profile" onClick={onDrawerClose}>PROFILE</NavLink>
                <Separator borderColor="whiteAlpha.300" my="2" />
                <Box
                  px="4"
                  py="2"
                  borderRadius="md"
                  color="white"
                  cursor="pointer"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={() => {
                    navigate('/profile');
                    onDrawerClose();
                  }}
                >
                  Edit Profile
                </Box>
                <Box
                  px="4"
                  py="2"
                  borderRadius="md"
                  color="red.200"
                  cursor="pointer"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={() => {
                    handleLogout();
                    onDrawerClose();
                  }}
                >
                  Logout
                </Box>
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </DrawerPositioner>
      </DrawerRoot>
    </>
  );
}

