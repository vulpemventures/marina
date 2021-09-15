const DEFAULT_ERROR_MSG = 'Unknown error';

export function extractErrorMessage(error: unknown, defaultMsg: string = DEFAULT_ERROR_MSG) {
  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;
  return defaultMsg;
}
