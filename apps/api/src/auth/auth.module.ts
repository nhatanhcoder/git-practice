import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NotificationsModule } from '../notifications/notifications.module';

// NotificationsModule is imported only for its transaction-scoped create service —
// register fans out a `new_*_registration` row to every active admin inside the very
// transaction that creates the account (INV-NOTIF-13, 07-notifications.md §10.1).
@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
