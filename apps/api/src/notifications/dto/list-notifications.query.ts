import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { NOTIFICATION_TYPES, type NotificationTypeName } from '../notifications.service';

/**
 * Query contract for `GET /api/v1/notifications`, from `07-notifications.md` §3.
 *
 * An out-of-enum `type` fails with VALIDATION_ERROR rather than being dropped — a silently
 * ignored filter returns a *broader* set than the caller asked for, the same dangerous
 * failure direction INV-USERS-04 exists for.
 */
export class ListNotificationsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải ≥ 1' })
  page: number = 1;

  /**
   * Cap 50 is *proposed* in the spec (API_CONVENTIONS.md sets no cap) and applied anyway:
   * the bell dropdown asks for 6, "View all" paginates — nothing legitimate needs more.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải ≥ 1' })
  @Max(50, { message: 'limit tối đa là 50' })
  limit: number = 20;

  // Query strings are always strings; without this transform `?isRead=false` arrives as
  // the truthy string "false" and the filter quietly inverts its meaning.
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isRead chỉ nhận true | false' })
  isRead?: boolean;

  @IsOptional()
  @IsIn(NOTIFICATION_TYPES as unknown as string[], {
    message: `type phải thuộc ${NOTIFICATION_TYPES.join(' | ')}`,
  })
  type?: NotificationTypeName;
}
