import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { TeacherClassesController } from './teacher-classes.controller';
import { AdminClassesController } from './admin-classes.controller';
import { StudentClassesController } from './student-classes.controller';

@Module({
  controllers: [TeacherClassesController, AdminClassesController, StudentClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
