import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Flashcard, FlashcardSchema } from '../mongodb/schemas/flashcard.schema';
import {
  UserFlashcardState,
  UserFlashcardStateSchema,
} from '../mongodb/schemas/user-flashcard-state.schema';
import { FlashcardsService } from './flashcards.service';
import { StudentFlashcardsController } from './student-flashcards.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Flashcard.name, schema: FlashcardSchema },
      { name: UserFlashcardState.name, schema: UserFlashcardStateSchema },
    ]),
  ],
  controllers: [StudentFlashcardsController],
  providers: [FlashcardsService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}

