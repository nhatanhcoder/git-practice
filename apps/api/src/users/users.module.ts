import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';
import { NotificationsModule } from '../notifications/notifications.module';

// NotificationsModule only supplies the transaction-scoped create service: approve and
// suspend each write one account_* row inside the same transaction as the status flip
// (INV-USERS-13/14 → 07-notifications.md §10.1).
@Module({
  imports: [NotificationsModule],
  controllers: [AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
