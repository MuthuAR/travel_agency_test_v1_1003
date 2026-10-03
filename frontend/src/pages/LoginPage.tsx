import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Link, Text, VStack } from '@chakra-ui/react';
import { AuthShell } from '../components/auth/AuthShell';
import { LoginForm } from '../components/auth/LoginForm';
import { getPostLoginPath } from '../lib/navigation';
import type { User } from '../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSuccess = (user: User): void => {
    navigate(getPostLoginPath(user, location.state), { replace: true });
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to plan your next trip">
      <LoginForm onSuccess={handleSuccess} />
      <VStack mt={6} spacing={1}>
        <Text fontSize="sm" color="gray.600">
          New here?{' '}
          <Link as={RouterLink} to="/register" color="brand.600" fontWeight="semibold">
            Create an account
          </Link>
        </Text>
        <Link as={RouterLink} to="/admin/login" fontSize="xs" color="gray.500">
          Admin sign in
        </Link>
      </VStack>
    </AuthShell>
  );
}
