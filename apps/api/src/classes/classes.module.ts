import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { TeacherClassesController } from './teacher-classes.controller';
import { AdminClassesController } from './admin-classes.controller';

@Module({
  controllers: [TeacherClassesController, AdminClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
