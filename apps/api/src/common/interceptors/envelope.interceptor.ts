import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/** A handler that already produced `{ data, meta }` and must not be wrapped twice. */
export type Paginated<T> = { data: T[]; meta: Record<string, unknown> };

function isPaginated(value: unknown): value is Paginated<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    Array.isArray((value as Paginated<unknown>).data)
  );
}

/**
 * Wraps every successful response in `{ "data": ... }` per `API_CONVENTIONS.md`
 * § Response Format, and leaves a handler's own `{ data, meta }` alone so list
 * endpoints can supply pagination meta.
 *
 * Single objects are `{ data: {...} }`, **not** `{ data: { user: {...} } }`. The FE
 * contracts for the two Admin user screens and `admin-profile` record the extra
 * wrapper; API_CONVENTIONS.md is the normative source and wins (owner decision,
 * 2026-09-03). Those FE specs have to be corrected — tracked in `02-users.md` §16.
 *
 * 204 responses carry no body, so they pass through untouched.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload === undefined || payload === null) return payload;
        if (isPaginated(payload)) return payload;
        return { data: payload };
      }),
    );
  }
}
