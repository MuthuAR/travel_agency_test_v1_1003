export type UserRole = 'customer' | 'admin';

export type CommunicationMedium = 'whatsapp' | 'sms' | 'email';

// ASSUMPTION: the PRP does not enumerate gender values.
export type Gender = 'male' | 'female' | 'other';

// Lifecycle: staff may move between any non-new statuses; an enquiry never returns to new.
export type EnquiryStatus = 'new' | 'ack' | 'confirmed' | 'cancelled' | 'completed';

/** Statuses staff may set (never 'new'). */
export type AdminSettableStatus = Exclude<EnquiryStatus, 'new'>;

export interface StatusHistoryEntry {
  id: number;
  from_status: EnquiryStatus | null;
  to_status: EnquiryStatus;
  changed_at: string;
  changed_by_email: string | null;
}

/** Customer dashboard filters; all apply to the date the enquiry was submitted. */
export interface EnquiryFilters {
  status?: EnquiryStatus;
  year?: number;
  month?: number;
  date?: string;
}

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
  /** Null for organisation accounts. */
  gender: Gender | null;
  /** Empty for organisation accounts. */
  spoken_languages: string[];
  /** Empty for organisation accounts. */
  communication_mediums: CommunicationMedium[];
  address: string;
  mobile: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryPassenger {
  id: number;
  position: number;
  name: string;
  mobile: string;
  gender: Gender;
  spoken_languages: string[];
  communication_mediums: CommunicationMedium[];
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
  /** Employees listed on an organisation enquiry; empty/absent for personal enquiries. */
  passengers?: EnquiryPassenger[];
  additional_travellers_count?: number;
  created_at: string;
  updated_at: string;
}

/** Admin view: enquiry together with the customer's profile. */
export interface AdminEnquiry extends Enquiry {
  customer: CustomerProfile | null;
  /** Oldest first; present on detail responses, null on the admin list. */
  status_history?: StatusHistoryEntry[] | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PassengerPayload {
  name: string;
  mobile: string;
  gender: Gender;
  spoken_languages: string[];
  communication_mediums: CommunicationMedium[];
}

export interface EnquiryCreatePayload {
  start_date: string;
  end_date: string;
  pickup_location: string;
  drop_location: string;
  travel_routes: string;
  /** Omitted for organisation enquiries (the server derives the total). */
  adults_count?: number;
  kids_count?: number;
  vehicle_preference: string;
  others?: string;
  /** Organisation enquiries only. */
  passengers?: PassengerPayload[];
  additional_travellers_count?: number;
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
  /** Omitted for organisation accounts. */
  gender?: Gender;
  spoken_languages?: string[];
  communication_mediums?: CommunicationMedium[];
  address: string;
}

/** Body for PUT /profile. */
export interface ProfileUpdatePayload {
  /** Only for organisation accounts; account_type itself can never be changed. */
  organization_name?: string;
  name: string;
  /** Omitted for organisation accounts. */
  gender?: Gender;
  spoken_languages?: string[];
  communication_mediums?: CommunicationMedium[];
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
