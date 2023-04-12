import axios from 'axios';

const DEFAULT_ERROR_MSG = 'Unknown error';

/**
 * Extract a string from the unknown error param to show in the UI
 * @param error unknown or AxiosError type object
 * @param defaultMsg optional default message
 * @returns a string
 */
export function extractErrorMessage(
  error: unknown,
  defaultMsg: string = DEFAULT_ERROR_MSG
): string {
  // if is already a string, return it
  if (typeof error === 'string') return error;

  // since AxiosError is an instance of Error, this should come first
  if (axios.isAxiosError(error)) {
    if (error.response) return error.response.data;
    if (error.request) return error.request.data;
  }

  // this should be last
  if (error instanceof Error) return error.message;

  return defaultMsg;
}
