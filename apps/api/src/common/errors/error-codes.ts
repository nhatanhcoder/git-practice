/**
 * The subset of `docs/api/API_ERROR_CODES.md` this app actually emits.
 *
 * Codes are copied, never invented — API_ERROR_CODES.md is the registry and adding
 * to it is a documentation decision, not a coding one. Codes the registry marks
 * *proposed, not agreed* are deliberately absent: `TOO_MANY_REQUESTS` among them,
 * which is why no rate limiting is wired up yet (01-auth.md §16).
 */
export const ErrorCode = {
  // Auth (registry § Auth Errors)
  AUTH_EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_PENDING: 'AUTH_ACCOUNT_PENDING',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REFRESH_INVALID: 'AUTH_REFRESH_INVALID',
  AUTH_INSUFFICIENT_ROLE: 'AUTH_INSUFFICIENT_ROLE',

  // User (registry § User Errors)
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Validation + fallbacks (registry § Validation Errors, § Fallback Errors)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * HTTP status for each code, exactly as the registry tables state it.
 *
 * `AUTH_ACCOUNT_SUSPENDED` is 403 here because that is what the registry says. Note
 * that `ENTITY_USER.md` says a suspended user's token is rejected with **401** — the
 * contradiction is open in `01-auth.md` §16 and `02-users.md` §16, and it is not a
 * detail: the frontend treats 401 as "refresh then log out" and 403 as "show a
 * message", so the wrong pick makes the FE refresh in a loop. Following the registry
 * is the conservative reading; revisit when the owner settles it.
 */
export const ERROR_STATUS: Record<ErrorCodeValue, number> = {
  AUTH_EMAIL_EXISTS: 409,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_ACCOUNT_PENDING: 403,
  AUTH_ACCOUNT_SUSPENDED: 403,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_REFRESH_INVALID: 401,
  AUTH_INSUFFICIENT_ROLE: 403,
  USER_NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  DUPLICATE_ENTRY: 409,
  INTERNAL_SERVER_ERROR: 500,
};
