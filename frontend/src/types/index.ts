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
  /** Idle timeout in minutes for customers; null (or absent) for admins. */
  idle_timeout_minutes?: number | null;
  /** /auth/me does not return timestamps; present only on full user objects. */
  created_at?: string;
  updated_at?: string;
}

export type AccountType = 'personal' | 'organization';

/** Profile as returned by the API (mobile/email merged in from User). */
export interface CustomerProfile {
  id: number;
  user_id: number;
  account_type: AccountType;
  /** Organisation name for organisation accounts; null for personal accounts. */
  organization_name: string | null;
  /** Full name for personal accounts; contact person for organisation accounts. */
  name: string;
  gender: Gender;
  spoken_languages: string[];
  communication_mediums: CommunicationMedium[];
  address: string;
  mobile: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enquiry {
  id: number;
  /** 1-based per-user sequence number shown to customers; falls back to `id`. */
  enquiry_no?: number | null;
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
  account_type: AccountType;
  /** Required for organisation accounts; omitted for personal accounts. */
  organization_name?: string;
  mobile: string;
  email?: string;
  password: string;
  name: string;
  gender: Gender;
  spoken_languages: string[];
  communication_mediums: CommunicationMedium[];
  address: string;
}

/** Body for PUT /profile. */
export interface ProfileUpdatePayload {
  /** Only for organisation accounts; account_type itself can never be changed. */
  organization_name?: string;
  name: string;
  gender: Gender;
  spoken_languages: string[];
  communication_mediums: CommunicationMedium[];
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
