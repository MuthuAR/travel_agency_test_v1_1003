import type { AccountType, CommunicationMedium, Gender } from '../types';
import type { FieldErrors } from './errors';

const MOBILE_REGEX = /^\+?[0-9]{10,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const COMMON_LANGUAGES: readonly string[] = [
  'English',
  'Tamil',
  'Hindi',
];

export const GENDER_OPTIONS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const MEDIUM_OPTIONS: ReadonlyArray<{ value: CommunicationMedium; label: string }> = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

export const ACCOUNT_TYPE_OPTIONS: ReadonlyArray<{ value: AccountType; label: string }> = [
  { value: 'personal', label: 'Personal' },
  { value: 'organization', label: 'Organization' },
];

export function isAccountType(value: string): value is AccountType {
  return value === 'personal' || value === 'organization';
}

/** Organisation name: required, 2-200 characters after trimming. */
export function validateOrganizationName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Organization name is required';
  if (trimmed.length < 2 || trimmed.length > 200) {
    return 'Organization name must be 2-200 characters';
  }
  return undefined;
}

export function isGender(value: string): value is Gender {
  return value === 'male' || value === 'female' || value === 'other';
}

export function isCommunicationMedium(value: string): value is CommunicationMedium {
  return value === 'whatsapp' || value === 'sms' || value === 'email';
}

/** Keep only valid, unique media, in the canonical option order. */
export function normalizeMediums(values: readonly string[]): CommunicationMedium[] {
  return MEDIUM_OPTIONS.map((option) => option.value).filter((medium) => values.includes(medium));
}

/** Human-readable list, e.g. "WhatsApp, SMS". */
export function formatMediums(values: readonly CommunicationMedium[]): string {
  const labels = MEDIUM_OPTIONS.filter((option) => values.includes(option.value)).map(
    (option) => option.label,
  );
  return labels.join(', ');
}

/** Strip spaces and dashes from a phone number. */
export function normalizeMobile(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export function validateMobile(value: string): string | undefined {
  const normalized = normalizeMobile(value);
  if (!normalized) return 'Mobile number is required';
  if (!MOBILE_REGEX.test(normalized)) return 'Enter a valid mobile number (10-15 digits, optional +)';
  return undefined;
}

/** Email is optional: an empty value is valid. */
export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return EMAIL_REGEX.test(trimmed) ? undefined : 'Enter a valid email address';
}

export function validatePassword(value: string): string | undefined {
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must contain at least one letter and one digit';
  }
  return undefined;
}

/** Form-state for the shared profile fields (name, gender, languages, medium, address). */
export interface ProfileFieldValues {
  name: string;
  gender: Gender | '';
  languages: string[];
  otherLanguages: string;
  communicationMediums: CommunicationMedium[];
  address: string;
}

export const EMPTY_PROFILE_VALUES: ProfileFieldValues = {
  name: '',
  gender: '',
  languages: [],
  otherLanguages: '',
  communicationMediums: [],
  address: '',
};

/** Merge checked languages with comma-separated "other" languages (deduplicated). */
export function buildLanguages(selected: string[], other: string): string[] {
  const extras = other
    .split(',')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return Array.from(new Set([...selected, ...extras]));
}

/** Inverse of buildLanguages, for loading a saved profile into the form. */
export function splitLanguages(all: string[]): { languages: string[]; otherLanguages: string } {
  const languages = all.filter((l) => COMMON_LANGUAGES.includes(l));
  const otherLanguages = all.filter((l) => !COMMON_LANGUAGES.includes(l)).join(', ');
  return { languages, otherLanguages };
}

/** Errors are keyed by the backend field names. */
export function validateProfileFields(values: ProfileFieldValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  if (!values.gender) errors.gender = 'Select a gender';
  if (buildLanguages(values.languages, values.otherLanguages).length === 0) {
    errors.spoken_languages = 'Select or enter at least one language';
  }
  if (values.communicationMediums.length === 0) {
    errors.communication_mediums = 'Select at least one communication medium';
  }
  if (!values.address.trim()) errors.address = 'Address is required';
  return errors;
}
