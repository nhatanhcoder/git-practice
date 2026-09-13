import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from '../mongodb/schemas/question.schema';
import { AttemptsService } from './attempts.service';
import { AiSuggestService } from './ai-suggest.service';
import { GradingService } from './grading.service';
import { StudentAttemptsController } from './student-attempts.controller';
import { TeacherAttemptsController } from './teacher-attempts.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }])],
  controllers: [StudentAttemptsController, TeacherAttemptsController],
  providers: [AttemptsService, AiSuggestService, GradingService],
  exports: [AttemptsService, GradingService],
})
export class AttemptsModule {}
