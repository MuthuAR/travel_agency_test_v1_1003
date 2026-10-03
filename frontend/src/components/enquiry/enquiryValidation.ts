import { buildLanguages, validateMobile } from '../../lib/validation';
import type { CommunicationMedium, Gender } from '../../types';

export const VEHICLE_OPTIONS: readonly string[] = [
  'Sedan',
  'SUV',
  'Tempo Traveller',
  'Mini Bus',
  'Bus',
  'No preference',
];

export interface EnquiryFormValues {
  start_date: string;
  end_date: string;
  pickup_location: string;
  drop_location: string;
  travel_routes: string;
  adults_count: string;
  kids_count: string;
  vehicle_preference: string;
  others: string;
}

export type EnquiryFormErrors = Partial<Record<keyof EnquiryFormValues, string>>;

export const INITIAL_ENQUIRY_VALUES: EnquiryFormValues = {
  start_date: '',
  end_date: '',
  pickup_location: '',
  drop_location: '',
  travel_routes: '',
  adults_count: '1',
  kids_count: '0',
  vehicle_preference: 'No preference',
  others: '',
};

/** Today as YYYY-MM-DD in local time. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function parseCount(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

/** Date, location, route and vehicle rules shared by personal and organisation enquiries. */
function validateEnquiryBase(values: EnquiryFormValues): EnquiryFormErrors {
  const errors: EnquiryFormErrors = {};

  if (!values.start_date) {
    errors.start_date = 'Start date is required';
  } else if (values.start_date < todayIso()) {
    errors.start_date = 'Start date cannot be in the past';
  }

  if (!values.end_date) {
    errors.end_date = 'End date is required';
  } else if (values.start_date && values.end_date < values.start_date) {
    errors.end_date = 'End date must be on or after the start date';
  }

  if (!values.pickup_location.trim()) errors.pickup_location = 'Pickup location is required';
  if (!values.drop_location.trim()) errors.drop_location = 'Drop location is required';
  if (!values.travel_routes.trim()) errors.travel_routes = 'Travel routes are required';
  if (!values.vehicle_preference) errors.vehicle_preference = 'Select a vehicle preference';

  return errors;
}

export const MAX_EMPLOYEES = 50;
export const MAX_ADDITIONAL_TRAVELLERS = 100;
export const MAX_TOTAL_TRAVELLERS = 100;

/** Form state of one employee card on an organisation enquiry. */
export interface PassengerFormValues {
  name: string;
  mobile: string;
  gender: Gender | '';
  languages: string[];
  otherLanguages: string;
  communicationMediums: CommunicationMedium[];
}

export type PassengerField =
  | 'name'
  | 'mobile'
  | 'gender'
  | 'spoken_languages'
  | 'communication_mediums';

export type PassengerErrors = Partial<Record<PassengerField, string>>;

export const EMPTY_PASSENGER_VALUES: PassengerFormValues = {
  name: '',
  mobile: '',
  gender: '',
  languages: [],
  otherLanguages: '',
  communicationMediums: [],
};

export interface OrganizationEnquiryErrors {
  base: EnquiryFormErrors;
  /** One entry per employee, same order. */
  passengers: PassengerErrors[];
  additional_travellers_count?: string;
  total?: string;
}

export function validatePassenger(values: PassengerFormValues): PassengerErrors {
  const errors: PassengerErrors = {};
  const name = values.name.trim();
  if (!name) {
    errors.name = 'Name is required';
  } else if (name.length > 100) {
    errors.name = 'Name must be at most 100 characters';
  }
  const mobileError = validateMobile(values.mobile);
  if (mobileError) errors.mobile = mobileError;
  if (!values.gender) errors.gender = 'Select a gender';
  if (buildLanguages(values.languages, values.otherLanguages).length === 0) {
    errors.spoken_languages = 'Select or enter at least one language';
  }
  if (values.communicationMediums.length === 0) {
    errors.communication_mediums = 'Select at least one communication medium';
  }
  return errors;
}

/** Parsed additional-travellers count; NaN when empty or not a whole number. */
export function parseAdditional(value: string): number {
  const n = parseCount(value);
  return Number.isInteger(n) ? n : Number.NaN;
}

/** Employees listed plus the count-only travellers (invalid additional counts as 0). */
export function totalTravellers(employeeCount: number, additional: string): number {
  const extra = parseAdditional(additional);
  return employeeCount + (Number.isNaN(extra) || extra < 0 ? 0 : extra);
}

export function hasOrganizationErrors(errors: OrganizationEnquiryErrors): boolean {
  return (
    Object.keys(errors.base).length > 0 ||
    errors.passengers.some((p) => Object.keys(p).length > 0) ||
    errors.additional_travellers_count !== undefined ||
    errors.total !== undefined
  );
}

export function validateOrganizationEnquiry(
  values: EnquiryFormValues,
  passengers: PassengerFormValues[],
  additional: string,
): OrganizationEnquiryErrors {
  const result: OrganizationEnquiryErrors = {
    base: validateEnquiryBase(values),
    passengers: passengers.map(validatePassenger),
  };
  const extra = parseAdditional(additional);
  if (Number.isNaN(extra) || extra < 0 || extra > MAX_ADDITIONAL_TRAVELLERS) {
    result.additional_travellers_count = 'Enter a number between 0 and 100';
  } else if (passengers.length + extra < 1) {
    result.total = 'At least one traveller is required';
  } else if (passengers.length + extra > MAX_TOTAL_TRAVELLERS) {
    result.total = 'Total travellers cannot exceed 100';
  }
  return result;
}

export function validateEnquiry(values: EnquiryFormValues): EnquiryFormErrors {
  const errors: EnquiryFormErrors = validateEnquiryBase(values);

  const adults = parseCount(values.adults_count);
  const kids = parseCount(values.kids_count);

  if (!Number.isInteger(adults) || adults < 0) {
    errors.adults_count = 'Enter a valid number of adults';
  }
  if (!Number.isInteger(kids) || kids < 0) {
    errors.kids_count = 'Enter a valid number of kids';
  }
  if (!errors.adults_count && !errors.kids_count && adults + kids < 1) {
    errors.adults_count = 'At least one passenger is required';
  }

  return errors;
}
