import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { TeacherLessonsController } from './teacher-lessons.controller';

@Module({
  controllers: [TeacherLessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
