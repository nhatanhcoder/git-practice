import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

/**
 * Mailbox + the shared create service other modules call inside their transactions.
 * Imported by AuthModule (register fan-out), UsersModule (approve/suspend) and
 * BillingModule (new_invoice). Produces no notifications of its own — it is the
 * destination, not the source (07-notifications.md §0/§10).
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
