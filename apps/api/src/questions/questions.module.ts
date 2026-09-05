import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from '../mongodb/schemas/question.schema';
import { QuestionsService } from './questions.service';
import { TeacherQuestionsController } from './teacher-questions.controller';

/**
 * The first module that actually uses MongoDB. Until now the Mongoose connection
 * existed only so `/health` could ping it — no schema, no model, no read or write.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }])],
  controllers: [TeacherQuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
