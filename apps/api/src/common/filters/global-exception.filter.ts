import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import http from 'node:http';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ErrorCode } from '../errors/error-codes';

/**
 * Emits the flat error envelope from `API_CONVENTIONS.md` § Error Envelope:
 *
 *   { statusCode, error, code, message, details?, timestamp, path }
 *
 * Flat is the settled shape (HANDOFF 2026-08-14): no `success` flag, no nested
 * `error` object — `error` is the HTTP reason phrase, a string. `details` is
 * `Record<field, string[]>` and appears **only** on VALIDATION_ERROR, so it is
 * omitted rather than sent as null.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = 500;
    let code: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Đã xảy ra lỗi không mong muốn';
    let details: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null && 'code' in body) {
        // An AppException, or anything else that already carries a registry code.
        const shaped = body as { code: string; message?: string; details?: Record<string, string[]> };
        code = shaped.code;
        message = shaped.message ?? exception.message;
        details = shaped.details;
      } else {
        // A bare Nest exception (router 404, default guard 401/403, 400 validation).
        // Preserve client HTTP status; do NOT rewrite to 500.
        if (status === 400) code = ErrorCode.VALIDATION_ERROR;
        else if (status === 401) code = ErrorCode.AUTH_TOKEN_INVALID;
        else if (status === 403) code = ErrorCode.AUTH_INSUFFICIENT_ROLE;
        else if (status === 404) code = ErrorCode.USER_NOT_FOUND;
        else if (status === 409) code = ErrorCode.DUPLICATE_ENTRY;
        else if (status === 429) code = ErrorCode.AUTH_TOO_MANY_REQUESTS;
        else code = ErrorCode.INTERNAL_SERVER_ERROR;

        if (typeof body === 'string') {
          message = body;
        } else if (typeof body === 'object' && body !== null && 'message' in body) {
          const rawMessage = (body as any).message;
          message = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);
        } else {
          message = exception.message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = 409;
        code = ErrorCode.DUPLICATE_ENTRY;
        message = 'Dữ liệu đã tồn tại';
      }
    }

    if (status >= 500) {
      // Log the cause server-side only. The registry is explicit that internals must
      // not reach the client, so the response keeps the generic message above.
      this.logger.error(
        `${req.method} ${req.originalUrl} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      error: http.STATUS_CODES[status] ?? HttpStatus[status] ?? 'Error',
      code,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  }
}
