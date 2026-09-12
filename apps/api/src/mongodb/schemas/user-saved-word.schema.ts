import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * One bookmarked word in a student's personal bank — ENTITY_USER_SAVED_WORD.md verbatim.
 *
 * This is a bookmark list, NOT an SRS state: saving never creates a UserFlashcardState
 * (entity rule; INV-WB-06), and deleting never touches one (INV-WB-08). hanzi/pinyin/
 * meaning are copied at save time, so a later catalog edit never rewrites a banked word
 * (INV-WB-04).
 */
export type UserSavedWordDocument = HydratedDocument<UserSavedWord>;

export const WORD_BANK_SOURCE_TYPES = [
  'lesson',
  'passage',
  'flashcard_browser',
  'other',
] as const;

export type WordBankSourceType = (typeof WORD_BANK_SOURCE_TYPES)[number];

@Schema({ collection: 'user_saved_words', timestamps: true })
export class UserSavedWord {
  // PG User uuid, carried as a string — same convention as user_flashcard_states.
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, trim: true })
  hanzi!: string;

  @Prop({ required: true, trim: true })
  pinyin!: string;

  @Prop({ required: true, trim: true })
  meaning!: string;

  @Prop({ required: true, enum: WORD_BANK_SOURCE_TYPES })
  sourceType!: WordBankSourceType;

  @Prop({ trim: true })
  sourceId?: string;

  @Prop({ trim: true })
  note?: string;

  // "Last bookmarked", bumped by every upsert — the entity's duplicate rule, not
  // createdAt, which timestamps: true keeps as the original save.
  @Prop({ required: true, default: () => new Date() })
  savedAt!: Date;
}

export const UserSavedWordSchema = SchemaFactory.createForClass(UserSavedWord);
// INV-WB-02's enforcement point: the upsert in the service relies on this unique index.
UserSavedWordSchema.index({ userId: 1, hanzi: 1 }, { unique: true });
