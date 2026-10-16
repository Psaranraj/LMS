import { ApiError } from './apiClient';

/** Short readable text for any error thrown by the API client. */
export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return e instanceof Error ? e.message : 'Something went wrong';
}
