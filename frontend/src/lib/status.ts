import type { AdminSettableStatus, EnquiryStatus } from '../types';

/** All statuses in lifecycle order. */
export const STATUS_ORDER: EnquiryStatus[] = ['new', 'ack', 'confirmed', 'cancelled', 'completed'];

/** Statuses staff can choose (never 'new'). */
export const ADMIN_SETTABLE_STATUSES: AdminSettableStatus[] = [
  'ack',
  'confirmed',
  'cancelled',
  'completed',
];

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  ack: 'Acknowledged',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const STATUS_COLORS: Record<EnquiryStatus, string> = {
  new: 'blue',
  ack: 'purple',
  confirmed: 'green',
  cancelled: 'red',
  completed: 'teal',
};

export function isStatus(value: string): value is EnquiryStatus {
  return STATUS_ORDER.some((s) => s === value);
}

export function isSettableStatus(value: string): value is AdminSettableStatus {
  return ADMIN_SETTABLE_STATUSES.some((s) => s === value);
}

/** Label for a status, falling back to the raw value for unknown ones. */
export function statusLabel(status: string): string {
  return isStatus(status) ? STATUS_LABELS[status] : status;
}
