import axios from 'axios';
import type { ApiErrorBody, ValidationErrorItem } from '../types';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

function isValidationList(detail: ApiErrorBody['detail']): detail is ValidationErrorItem[] {
  return Array.isArray(detail);
}

/** Extract a user-presentable message from any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && isValidationList(detail) && detail.length > 0) {
      return detail.map((item) => item.msg).join('. ');
    }
    if (!error.response) return 'Unable to reach the server. Check your connection.';
    return FALLBACK_MESSAGE;
  }
  if (error instanceof Error && error.message) return error.message;
  return FALLBACK_MESSAGE;
}

export type FieldErrors = Partial<Record<string, string>>;

/** Map FastAPI 422 validation items to `{ fieldName: message }` (last `loc` segment). */
export function getFieldErrors(error: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (!axios.isAxiosError<ApiErrorBody>(error)) return result;
  const detail = error.response?.data?.detail;
  if (!detail || !isValidationList(detail)) return result;
  for (const item of detail) {
    const field = item.loc[item.loc.length - 1];
    if (typeof field === 'string' && result[field] === undefined) {
      result[field] = item.msg.replace(/^Value error, /, '');
    }
  }
  return result;
}
