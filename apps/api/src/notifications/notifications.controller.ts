import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ListNotificationsQuery } from './dto/list-notifications.query';
import { NotificationsService } from './notifications.service';

/**
 * One user's mailbox — `07-notifications.md` §2. Deliberately NO `@Roles`: every
 * authenticated role reads their own mailbox, and there is no parameter anywhere on this
 * controller that could address another user's rows (INV-NOTIF-05/08). Notifications are
 * created only by business modules through `NotificationsService.createManyWithinTx`;
 * there is no POST and no DELETE here, ever (append-only, INV-NOTIF-01).
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Static segments are declared before the parameterised `:id/read` so a future verb
  // added alongside them can never be swallowed by the `:id` match (same reasoning as
  // student-classes.controller.ts).
  @Get()
  @ApiOperation({ summary: "List one's own notifications, newest first (07-notifications §2)" })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQuery) {
    return this.notifications.list(user.id, query);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every unread notification of mine as read — one statement' })
  readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.readAll(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: "My unread count — the red badge on the bell (DEBT-002 polling)" })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: "Mark one of my notifications read — idempotent no-op once already read",
  })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
