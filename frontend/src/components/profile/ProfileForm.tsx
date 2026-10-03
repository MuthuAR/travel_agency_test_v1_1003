import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Center,
  Box,
  HStack,
  Spinner,
  Text,
  VStack,
  chakra,
} from '@chakra-ui/react';
import { AnimatedInput } from '../ui/AnimatedInput';
import { GradientButton } from '../ui/GradientButton';
import { ProfileFields } from './ProfileFields';
import { profileService } from '../../services/profileService';
import { getErrorMessage, getFieldErrors } from '../../lib/errors';
import type { FieldErrors } from '../../lib/errors';
import {
  EMPTY_PROFILE_VALUES,
  buildLanguages,
  normalizeMobile,
  splitLanguages,
  validateEmail,
  validateMobile,
  validateOrganizationName,
  validateProfileFields,
} from '../../lib/validation';
import type { ProfileFieldValues } from '../../lib/validation';
import type { CustomerProfile } from '../../types';

interface ContactValues {
  mobile: string;
  email: string;
}

function toFieldValues(profile: CustomerProfile): ProfileFieldValues {
  const { languages, otherLanguages } = splitLanguages(profile.spoken_languages);
  return {
    name: profile.name,
    gender: profile.gender ?? '',
    languages,
    otherLanguages,
    communicationMediums: profile.communication_mediums,
    address: profile.address,
  };
}

/** View/edit form for the signed-in customer's profile. */
export function ProfileForm() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [values, setValues] = useState<ProfileFieldValues>(EMPTY_PROFILE_VALUES);
  const [contact, setContact] = useState<ContactValues>({ mobile: '', email: '' });
  const [organizationName, setOrganizationName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const applyProfile = useCallback((p: CustomerProfile): void => {
    setProfile(p);
    setValues(toFieldValues(p));
    setContact({ mobile: p.mobile, email: p.email ?? '' });
    setOrganizationName(p.organization_name ?? '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const p = await profileService.getProfile();
        if (!cancelled) applyProfile(p);
      } catch (error) {
        if (!cancelled) setLoadError(getErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [applyProfile]);

  const handleChange = (patch: Partial<ProfileFieldValues>): void => {
    setValues((prev) => ({ ...prev, ...patch }));
  };

  const handleCancel = (): void => {
    if (profile) applyProfile(profile);
    setErrors({});
    setFormError(null);
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setSaved(false);

    const isOrganization = profile?.account_type === 'organization';
    const found: FieldErrors = validateProfileFields(
      values,
      isOrganization ? 'organization' : 'personal',
    );
    if (isOrganization) {
      const organizationError = validateOrganizationName(organizationName);
      if (organizationError) found.organization_name = organizationError;
    }
    const mobileError = validateMobile(contact.mobile);
    if (mobileError) found.mobile = mobileError;
    const emailError = validateEmail(contact.email);
    if (emailError) found.email = emailError;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (!isOrganization && (values.gender === '' || values.communicationMediums.length === 0)) return;

    setSaving(true);
    try {
      const updated = await profileService.updateProfile({
        ...(isOrganization ? { organization_name: organizationName.trim() } : {}),
        name: values.name.trim(),
        ...(!isOrganization && values.gender !== ''
          ? {
              gender: values.gender,
              spoken_languages: buildLanguages(values.languages, values.otherLanguages),
              communication_mediums: values.communicationMediums,
            }
          : {}),
        address: values.address.trim(),
        mobile: normalizeMobile(contact.mobile),
        email: contact.email.trim() || null,
      });
      applyProfile(updated);
      setIsEditing(false);
      setSaved(true);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Center py={10}>
        <Spinner size="lg" color="brand.500" label="Loading profile" />
      </Center>
    );
  }

  if (loadError) {
    return (
      <Alert status="error" rounded="xl">
        <AlertIcon />
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  const isOrganizationAccount = profile?.account_type === 'organization';

  return (
    <chakra.form onSubmit={(e: FormEvent<HTMLFormElement>) => void handleSubmit(e)} noValidate>
      <VStack spacing={4} align="stretch">
        {saved && (
          <Alert status="success" rounded="xl">
            <AlertIcon />
            <AlertDescription>Profile updated</AlertDescription>
          </Alert>
        )}
        {formError && (
          <Alert status="error" rounded="xl">
            <AlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Account type
          </Text>
          <Text data-testid="account-type-value">{isOrganizationAccount ? 'Organization' : 'Personal'}</Text>
        </Box>
        {isOrganizationAccount && (
          <AnimatedInput
            label="Organization name"
            autoComplete="organization"
            value={organizationName}
            disabled={!isEditing}
            onChange={(e) => setOrganizationName(e.target.value)}
            error={errors.organization_name}
          />
        )}
        <AnimatedInput
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          value={contact.mobile}
          disabled={!isEditing}
          onChange={(e) => setContact((prev) => ({ ...prev, mobile: e.target.value }))}
          error={errors.mobile}
        />
        <AnimatedInput
          label="Email (optional)"
          type="email"
          autoComplete="email"
          value={contact.email}
          disabled={!isEditing}
          onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
          error={errors.email}
        />
        <ProfileFields
          values={values}
          errors={errors}
          onChange={handleChange}
          disabled={!isEditing}
          nameLabel={isOrganizationAccount ? 'Staff name' : 'Full name'}
          hidePersonalDetails={isOrganizationAccount}
        />
        {isEditing ? (
          <HStack spacing={3}>
            <GradientButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </GradientButton>
            <Button type="button" variant="ghost" rounded="full" onClick={handleCancel} isDisabled={saving}>
              Cancel
            </Button>
          </HStack>
        ) : (
          <GradientButton
            type="button"
            onClick={() => {
              setSaved(false);
              setIsEditing(true);
            }}
          >
            Edit profile
          </GradientButton>
        )}
      </VStack>
    </chakra.form>
  );
}
