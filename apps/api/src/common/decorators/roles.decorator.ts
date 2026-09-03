import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to the listed roles. Enforced by `RolesGuard`, which also
 * requires `status = active` — see INV-USERS-01, which is about the actor's status
 * as much as their role.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
