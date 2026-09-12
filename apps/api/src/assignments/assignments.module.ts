import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from '../mongodb/schemas/question.schema';
import {
  StudentAssignmentsController,
  TeacherAssignmentsController,
} from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  // Read-only access to Mongo questions: the only Mongo use is the INV-TASG-03
  // existence check on questionIds. Nothing here writes a question.
  imports: [MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }])],
  controllers: [TeacherAssignmentsController, StudentAssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
