import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
 * Recursively converts Prisma.Decimal instances to strings to adhere to ADR-010.
 */
function serializeDecimals(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (Prisma.Decimal.isDecimal(val)) {
    return val.toFixed(2);
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (Array.isArray(val)) {
    return val.map(serializeDecimals);
  }
  if (typeof val === 'object') {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serializeDecimals(v);
    }
    return res;
  }
  return val;
}

/**
 * Wraps every successful response in `{ "data": ... }` per `API_CONVENTIONS.md`
 * § Response Format, and leaves a handler's own `{ data, meta }` alone so list
 * endpoints can supply pagination meta.
 *
 * Single objects are `{ data: {...} }`, **not** `{ data: { user: {...} } }`.
 * 204 responses carry no body, so they pass through untouched.
 * Also serializes all Prisma Decimal objects into string representations per ADR-010.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload === undefined || payload === null) return payload;
        const serialized = serializeDecimals(payload);
        if (isPaginated(serialized)) return serialized;
        return { data: serialized };
      }),
    );
  }
}

