import { HttpException } from '@nestjs/common';
import { ERROR_STATUS, type ErrorCodeValue } from './error-codes';

/**
 * The only way this app should raise a client-visible error.
 *
 * Carrying `code` on the exception body is what lets the global filter emit the flat
 * envelope from `API_CONVENTIONS.md` without every throw site repeating the shape.
 * The HTTP status is looked up from the registry rather than passed in, so a code can
 * never be paired with the wrong status at one call site and the right one at another.
 */
export class AppException extends HttpException {
  constructor(
    code: ErrorCodeValue,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super({ code, message, details }, ERROR_STATUS[code]);
  }
}
