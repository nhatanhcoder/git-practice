import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opt a route out of `JwtAuthGuard`.
 *
 * Authentication is on by default and switched off per route, never the other way
 * round: a route that forgets a guard must fail closed. `/health` is the only
 * public route today.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
