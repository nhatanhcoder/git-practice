import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type UserFlashcardStateDocument = HydratedDocument<UserFlashcardState>;

@Schema({ collection: 'user_flashcard_states', timestamps: true })
export class UserFlashcardState {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Flashcard', required: true })
  flashcardId!: Types.ObjectId;

  @Prop({ default: 2.5, min: 1.3 })
  easeFactor!: number;

  @Prop({ default: 0, min: 0 })
  repetitionsCount!: number;

  @Prop({ default: 1, min: 1 })
  intervalDays!: number;

  @Prop({ default: () => new Date(), index: true })
  nextReviewDate!: Date;

  @Prop() lastReviewedAt?: Date;

  @Prop({ default: false })
  isSavedByUser!: boolean;

  // Required to calculate retention without retaining raw answer history.
  @Prop({ default: 0, min: 0 })
  totalReviews!: number;

  @Prop({ default: 0, min: 0 })
  correctReviews!: number;
}

export const UserFlashcardStateSchema = SchemaFactory.createForClass(UserFlashcardState);
UserFlashcardStateSchema.index({ userId: 1, flashcardId: 1 }, { unique: true });
UserFlashcardStateSchema.index({ userId: 1, nextReviewDate: 1 });

