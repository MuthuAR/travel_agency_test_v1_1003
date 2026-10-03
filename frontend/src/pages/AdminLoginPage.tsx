import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Link, VStack } from '@chakra-ui/react';
import { AuthShell } from '../components/auth/AuthShell';
import { LoginForm } from '../components/auth/LoginForm';
import { getPostLoginPath } from '../lib/navigation';
import type { User } from '../types';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSuccess = (user: User): void => {
    navigate(getPostLoginPath(user, location.state), { replace: true });
  };

  return (
    <AuthShell title="Admin sign in" subtitle="Staff access only">
      <LoginForm onSuccess={handleSuccess} requireAdmin submitLabel="Sign in as admin" />
      <VStack mt={6}>
        <Link as={RouterLink} to="/login" fontSize="sm" color="gray.600">
          Back to customer sign in
        </Link>
      </VStack>
    </AuthShell>
  );
}
