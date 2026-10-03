import axios from 'axios';
import type { ApiErrorBody } from '../types';

/** Map a FastAPI 422 response to { fieldName: message }. Empty when not a validation error. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!axios.isAxiosError<ApiErrorBody>(error)) return result;
  const detail = error.response?.data?.detail;
  if (!Array.isArray(detail)) return result;
  for (const item of detail) {
    const field = item.loc[item.loc.length - 1];
    if (typeof field === 'string' && !(field in result)) {
      result[field] = item.msg;
    }
  }
  return result;
}
