import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FlashcardDocument = HydratedDocument<Flashcard>;

@Schema({ collection: 'flashcards', timestamps: true })
export class Flashcard {
  @Prop({ required: true, min: 1, max: 9, index: true })
  hskLevel!: number;

  @Prop({ required: true, trim: true })
  hanzi!: string;

  @Prop({ required: true, trim: true })
  pinyin!: string;

  @Prop({ required: true, trim: true })
  meaning!: string;

  @Prop() exampleSentence?: string;
  @Prop() examplePinyin?: string;
  @Prop() exampleMeaning?: string;
  @Prop() audioUrl?: string;
  @Prop({ type: [String], default: [] }) tags!: string[];
}

export const FlashcardSchema = SchemaFactory.createForClass(Flashcard);
FlashcardSchema.index({ hskLevel: 1, hanzi: 1 });

