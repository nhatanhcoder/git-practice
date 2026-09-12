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
import { WordBankController } from './word-bank.controller';
import { WordBankService } from './word-bank.service';

/**
 * The word bank shares the flashcards' Mongo models read-only (catalog hydration +
 * existing-state display); it never writes a UserFlashcardState (INV-WB-06/08) — those
 * models are registered here so the service can READ them.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSavedWord.name, schema: UserSavedWordSchema },
      { name: Flashcard.name, schema: FlashcardSchema },
      { name: UserFlashcardState.name, schema: UserFlashcardStateSchema },
    ]),
  ],
  controllers: [WordBankController],
  providers: [WordBankService],
  exports: [WordBankService],
})
export class WordBankModule {}
