import { Module } from '@nestjs/common';
import { SupplementsModule } from '../supplements/supplements.module';
import { LessonsService } from './lessons.service';
import { TeacherLessonsController } from './teacher-lessons.controller';

@Module({
  imports: [SupplementsModule],
  controllers: [TeacherLessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
