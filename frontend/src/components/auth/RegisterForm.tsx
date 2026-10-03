import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  HStack,
  Radio,
  RadioGroup,
  VStack,
  chakra,
} from '@chakra-ui/react';
import { AnimatedInput } from '../ui/AnimatedInput';
import { GradientButton } from '../ui/GradientButton';
import { ProfileFields } from '../profile/ProfileFields';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../../lib/errors';
import type { FieldErrors } from '../../lib/errors';
import {
  ACCOUNT_TYPE_OPTIONS,
  EMPTY_PROFILE_VALUES,
  buildLanguages,
  isAccountType,
  normalizeMobile,
  validateEmail,
  validateMobile,
  validateOrganizationName,
  validatePassword,
  validateProfileFields,
} from '../../lib/validation';
import type { ProfileFieldValues } from '../../lib/validation';
import type { AccountType, User } from '../../types';

interface RegisterFormProps {
  onSuccess: (user: User) => void;
}

export const ACCOUNT_EXISTS_MESSAGE =
  'We could not create an account with these details. If you already registered, please sign in instead.';

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [organizationName, setOrganizationName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profile, setProfile] = useState<ProfileFieldValues>(EMPTY_PROFILE_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleProfileChange = (patch: Partial<ProfileFieldValues>): void => {
    setProfile((prev) => ({ ...prev, ...patch }));
  };

  const handleAccountTypeChange = (value: string): void => {
    if (!isAccountType(value)) return;
    setAccountType(value);
    if (value === 'personal') {
      setOrganizationName('');
      setErrors((prev) => {
        const next: FieldErrors = { ...prev };
        delete next.organization_name;
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    const found: FieldErrors = validateProfileFields(profile);
    if (accountType === 'organization') {
      const organizationError = validateOrganizationName(organizationName);
      if (organizationError) found.organization_name = organizationError;
    }
    const mobileError = validateMobile(mobile);
    if (mobileError) found.mobile = mobileError;
    const emailError = validateEmail(email);
    if (emailError) found.email = emailError;
    const passwordError = validatePassword(password);
    if (passwordError) found.password = passwordError;
    if (confirmPassword !== password) found.confirm_password = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const trimmedEmail = email.trim();
    // validateProfileFields guarantees gender and medium are set.
    if (profile.gender === '' || profile.communicationMediums.length === 0) return;

    setSubmitting(true);
    try {
      const user = await register({
        account_type: accountType,
        ...(accountType === 'organization' ? { organization_name: organizationName.trim() } : {}),
        mobile: normalizeMobile(mobile),
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        password,
        name: profile.name.trim(),
        gender: profile.gender,
        spoken_languages: buildLanguages(profile.languages, profile.otherLanguages),
        communication_mediums: profile.communicationMediums,
        address: profile.address.trim(),
      });
      onSuccess(user);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setFormError(ACCOUNT_EXISTS_MESSAGE);
      } else {
        const fieldErrors = getFieldErrors(error);
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
        setFormError(getErrorMessage(error));
      }
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
        <chakra.fieldset border="none" p={0} m={0} minW={0}>
          <chakra.legend fontSize="sm" fontWeight="medium" mb={2}>
            Account type
          </chakra.legend>
          <RadioGroup value={accountType} onChange={handleAccountTypeChange}>
            <HStack spacing={6}>
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </HStack>
          </RadioGroup>
        </chakra.fieldset>
        {accountType === 'organization' && (
          <AnimatedInput
            label="Organization name"
            autoComplete="organization"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            error={errors.organization_name}
          />
        )}
        <AnimatedInput
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          error={errors.mobile}
        />
        <AnimatedInput
          label="Email (optional)"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <ProfileFields
          values={profile}
          errors={errors}
          onChange={handleProfileChange}
          nameLabel={accountType === 'organization' ? 'Contact person name' : 'Full name'}
        />
        <AnimatedInput
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <AnimatedInput
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirm_password}
        />
        <GradientButton type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </GradientButton>
      </VStack>
    </chakra.form>
  );
}
