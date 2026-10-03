import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, AlertDescription, AlertIcon, VStack, chakra } from '@chakra-ui/react';
import { AnimatedInput } from '../ui/AnimatedInput';
import { GradientButton } from '../ui/GradientButton';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../lib/errors';
import type { FieldErrors } from '../../lib/errors';
import { normalizeMobile } from '../../lib/validation';
import type { User } from '../../types';

interface LoginFormProps {
  onSuccess: (user: User) => void;
  /** When true, a successful login by a non-admin is rolled back with an error. */
  requireAdmin?: boolean;
  submitLabel?: string;
}

export const NOT_ADMIN_MESSAGE = 'Not an admin account';

export function LoginForm({ onSuccess, requireAdmin = false, submitLabel = 'Sign in' }: LoginFormProps) {
  const { login, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    const found: FieldErrors = {};
    const trimmed = identifier.trim();
    if (!trimmed) found.identifier = 'Enter your email or mobile number';
    if (!password) found.password = 'Enter your password';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Emails are sent as typed; mobile numbers lose spaces/dashes.
    const normalized = trimmed.includes('@') ? trimmed : normalizeMobile(trimmed);

    setSubmitting(true);
    try {
      const user = await login(normalized, password);
      if (requireAdmin && user.role !== 'admin') {
        await logout();
        setFormError(NOT_ADMIN_MESSAGE);
        return;
      }
      onSuccess(user);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <chakra.form onSubmit={(e: FormEvent<HTMLFormElement>) => void handleSubmit(e)} noValidate>
      <VStack spacing={4} align="stretch">
        {formError && (
          <Alert status="error" rounded="xl">
            <AlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <AnimatedInput
          label="Email or mobile number"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
        />
        <AnimatedInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <GradientButton type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : submitLabel}
        </GradientButton>
      </VStack>
    </chakra.form>
  );
}
