import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMistake, UserMistakeSchema } from '../mongodb/schemas/user-mistake.schema';
import { Flashcard, FlashcardSchema } from '../mongodb/schemas/flashcard.schema';
import { Question, QuestionSchema } from '../mongodb/schemas/question.schema';
import { MistakesService } from './mistakes.service';
import { MistakesController } from './mistakes.controller';
@Module({
 imports: [MongooseModule.forFeature([
 {name: UserMistake.name, schema: UserMistakeSchema},
 {name: Flashcard.name, schema: FlashcardSchema},
 {name: Question.name, schema: QuestionSchema},
 ])],
 providers: [MistakesService], controllers: [MistakesController], exports: [MistakesService],
})
export class MistakesModule {}
