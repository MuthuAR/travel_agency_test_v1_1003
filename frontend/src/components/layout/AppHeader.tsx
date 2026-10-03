import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Flex, HStack, Link, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  label: string;
  to: string;
}

const CUSTOMER_NAV: NavItem[] = [
  { label: 'My Enquiries', to: '/dashboard' },
  { label: 'New enquiry', to: '/enquiries/new' },
  { label: 'Profile', to: '/profile' },
];

const ADMIN_NAV: NavItem[] = [{ label: 'All enquiries', to: '/admin/enquiries' }];

export function AppHeader() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const items = isAdmin ? ADMIN_NAV : CUSTOMER_NAV;

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate(isAdmin ? '/admin/login' : '/login', { replace: true });
  };

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      bg="whiteAlpha.800"
      backdropFilter="blur(16px)"
      borderBottom="1px solid"
      borderColor="gray.100"
    >
      <Flex maxW="container.xl" mx="auto" px={4} py={3} align="center" justify="space-between" gap={3} wrap="wrap">
        <HStack spacing={3}>
          <Text fontWeight="extrabold" bgGradient="linear(to-r, brand.500, accent.400)" bgClip="text">
            Travel Booking
          </Text>
          {isAdmin && (
            <Text fontSize="xs" fontWeight="bold" color="accent.600">
              ADMIN
            </Text>
          )}
        </HStack>
        <HStack as="nav" aria-label="Main navigation" spacing={4} wrap="wrap">
          {items.map((item) => (
            <Link key={item.to} as={RouterLink} to={item.to} fontWeight="medium">
              {item.label}
            </Link>
          ))}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              void handleLogout();
            }}
          >
            <Text color="gray.700" fontWeight="medium">
              Log out
            </Text>
          </motion.button>
        </HStack>
      </Flex>
    </Box>
  );
}
