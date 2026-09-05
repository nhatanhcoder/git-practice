import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export const USER_ROLES = ['admin', 'teacher', 'student'] as const;
export const USER_STATUSES = ['pending', 'active', 'suspended'] as const;
export const SORTABLE = ['createdAt', 'lastLoginAt'] as const;

/**
 * Query contract for `GET /api/v1/admin/users`, from `02-users.md` §3.
 *
 * An out-of-enum `role` or `status` must fail with VALIDATION_ERROR rather than being
 * quietly dropped — INV-USERS-04 exists because silently ignoring a bad filter returns
 * a *broader* set than the caller asked for, which is the dangerous direction to fail in.
 */
export class ListUsersQuery {
  @IsOptional()
  @IsIn(USER_ROLES, { message: `role phải thuộc ${USER_ROLES.join(' | ')}` })
  role?: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsIn(USER_STATUSES, { message: `status phải thuộc ${USER_STATUSES.join(' | ')}` })
  status?: (typeof USER_STATUSES)[number];

  /**
   * `q`, not `search` (owner decision 2026-09-03): the built Admin screens already
   * deep-link with `?q=`, and API_ADMIN.md only describes the capability in prose.
   * Blank after trimming counts as "not sent" (INV-USERS-05).
   */
  @IsOptional()
  @Transform(({ value }) => {
    const trimmed = typeof value === 'string' ? value.trim() : value;
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @Length(1, 100, { message: 'q phải dài từ 1 đến 100 ký tự sau khi trim' })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải ≥ 1' })
  page: number = 1;

  /**
   * Cap 100 is marked *proposed* in the spec because API_CONVENTIONS.md sets no cap.
   * Applied anyway: an uncapped `limit` is a denial-of-service handed to any caller,
   * and a cap can be raised later without breaking anyone.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải ≥ 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit: number = 20;

  @IsOptional()
  @IsIn(SORTABLE, { message: `sortBy phải thuộc ${SORTABLE.join(' | ')}` })
  sortBy: (typeof SORTABLE)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order phải là asc hoặc desc' })
  order: 'asc' | 'desc' = 'desc';
}
