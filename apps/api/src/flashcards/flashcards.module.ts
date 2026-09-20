import { MistakesModule } from '../mistakes/mistakes.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Flashcard, FlashcardSchema } from '../mongodb/schemas/flashcard.schema';
import {
  UserFlashcardState,
  UserFlashcardStateSchema,
} from '../mongodb/schemas/user-flashcard-state.schema';
import {
  UserSavedWord,
  UserSavedWordSchema,
} from '../mongodb/schemas/user-saved-word.schema';
import { FlashcardsService } from './flashcards.service';
import { StudentFlashcardsController } from './student-flashcards.controller';

@Module({
  imports: [MistakesModule,
    MongooseModule.forFeature([
      { name: Flashcard.name, schema: FlashcardSchema },
      { name: UserFlashcardState.name, schema: UserFlashcardStateSchema },
      { name: UserSavedWord.name, schema: UserSavedWordSchema },
    ]),
  ],
  controllers: [StudentFlashcardsController],
  providers: [FlashcardsService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}

