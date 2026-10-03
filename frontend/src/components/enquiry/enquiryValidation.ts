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

export function validateEnquiry(values: EnquiryFormValues): EnquiryFormErrors {
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

  if (!values.vehicle_preference) errors.vehicle_preference = 'Select a vehicle preference';

  return errors;
}
