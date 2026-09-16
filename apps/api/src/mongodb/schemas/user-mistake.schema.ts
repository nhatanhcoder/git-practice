import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
export type UserMistakeDocument = HydratedDocument<UserMistake>;
@Schema({ collection: 'user_mistakes', timestamps: true })
export class UserMistake {
  @Prop({ required: true }) userId!: string;
  @Prop({ required: true, enum: ['flashcard', 'question'] }) sourceType!: 'flashcard' | 'question';
  @Prop({ required: true }) sourceId!: string;
  @Prop({ required: true }) eventAt!: Date;
  @Prop({ required: true, enum: ['needs_review', 'reviewed'] }) status!: 'needs_review' | 'reviewed';
  @Prop({ required: true, default: 0 }) version!: number;
  @Prop({ type: Date, default: null }) lastReviewedAt!: Date | null;
}
export const UserMistakeSchema = SchemaFactory.createForClass(UserMistake);
UserMistakeSchema.index({ userId: 1, sourceType: 1, sourceId: 1 }, { unique: true });
UserMistakeSchema.index({ userId: 1, status: 1, eventAt: 1 });
