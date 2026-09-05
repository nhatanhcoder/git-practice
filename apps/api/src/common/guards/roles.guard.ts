import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Enforces `@Roles(...)`. Runs after `JwtAuthGuard`, so `req.user` is the live row.
 *
 * A route with no `@Roles` is open to any authenticated, active user — role
 * restrictions are stated per route, in the controller, next to the endpoint they
 * guard, so a reader of `admin-users.controller.ts` can see the rule without
 * chasing a central table.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) {
      throw new AppException(
        ErrorCode.AUTH_INSUFFICIENT_ROLE,
        'Không đủ quyền thực hiện thao tác này',
      );
    }
    return true;
  }
}
