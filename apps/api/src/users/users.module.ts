import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
