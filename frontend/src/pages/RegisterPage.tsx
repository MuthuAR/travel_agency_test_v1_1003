import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link, Text, VStack } from '@chakra-ui/react';
import { AuthShell } from '../components/auth/AuthShell';
import { RegisterForm } from '../components/auth/RegisterForm';
import { getPostLoginPath } from '../lib/navigation';
import type { User } from '../types';

export default function RegisterPage() {
  const navigate = useNavigate();

  const handleSuccess = (user: User): void => {
    navigate(getPostLoginPath(user, null), { replace: true });
  };

  return (
    <AuthShell title="Create your account" subtitle="Tell us a little about you" maxW="xl">
      <RegisterForm onSuccess={handleSuccess} />
      <VStack mt={6}>
        <Text fontSize="sm" color="gray.600">
          Already registered?{' '}
          <Link as={RouterLink} to="/login" color="brand.600" fontWeight="semibold">
            Sign in
          </Link>
        </Text>
      </VStack>
    </AuthShell>
  );
}
