export type UserRole = 'customer' | 'admin';

export type CommunicationMedium = 'whatsapp' | 'sms' | 'email';

// ASSUMPTION: the PRP does not enumerate gender values.
export type Gender = 'male' | 'female' | 'other';

// ASSUMPTION: the PRP only fixes the default `new`; remaining values are provisional.
export type EnquiryStatus = 'new' | 'contacted' | 'confirmed' | 'cancelled' | 'closed';

export interface User {
  id: number;
  mobile: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  /** /auth/me does not return timestamps; present only on full user objects. */
  created_at?: string;
  updated_at?: string;
}

/** Profile as returned by the API (mobile/email merged in from User). */
export interface CustomerProfile {
  id: number;
  user_id: number;
  name: string;
  gender: Gender;
  spoken_languages: string[];
  communication_medium: CommunicationMedium;
  address: string;
  mobile: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enquiry {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  pickup_location: string;
  drop_location: string;
  travel_routes: string;
  adults_count: number;
  kids_count: number;
  vehicle_preference: string;
  others: string | null;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
}

/** Admin view: enquiry together with the customer's profile. */
export interface AdminEnquiry extends Enquiry {
  customer: CustomerProfile | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface EnquiryCreatePayload {
  start_date: string;
  end_date: string;
  pickup_location: string;
  drop_location: string;
  travel_routes: string;
  adults_count: number;
  kids_count: number;
  vehicle_preference: string;
  others?: string;
}

export interface AdminEnquiryFilters {
  page: number;
  page_size: number;
  status?: EnquiryStatus;
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  /** Email OR mobile number. */
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  mobile: string;
  email?: string;
  password: string;
  name: string;
  gender: Gender;
  spoken_languages: string[];
  communication_medium: CommunicationMedium;
  address: string;
}

/** Body for PUT /profile. */
export interface ProfileUpdatePayload {
  name: string;
  gender: Gender;
  spoken_languages: string[];
  communication_medium: CommunicationMedium;
  address: string;
  mobile: string;
  email: string | null;
}

export interface ValidationErrorItem {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

/** FastAPI error body: `detail` is a string or a list of validation errors. */
export interface ApiErrorBody {
  detail: string | ValidationErrorItem[];
}
