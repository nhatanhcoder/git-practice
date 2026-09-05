import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AdminSessionsController } from './admin-sessions.controller';
import { TeacherSessionsController } from './teacher-sessions.controller';

@Module({
  controllers: [AdminSessionsController, TeacherSessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
