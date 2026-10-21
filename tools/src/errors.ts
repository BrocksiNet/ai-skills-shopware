// Turning a caught value into a message without assuming it is an Error.

/** The message of a thrown value: an Error's message, a thrown string, or a
 *  fixed text for anything else. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'unknown error';
}
