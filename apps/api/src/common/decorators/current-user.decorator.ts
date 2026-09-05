import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole, UserStatus } from '@prisma/client';

/** What `JwtAuthGuard` puts on the request after verifying the access token. */
export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest().user,
);
