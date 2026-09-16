import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

@Schema({ _id: false })
export class LearningWord {
  @Prop({ required: true }) hanzi!: string;
  @Prop({ required: true }) pinyin!: string;
  @Prop({ required: true }) meaning!: string;
}
export const LearningWordSchema = SchemaFactory.createForClass(LearningWord);
export type LearningUnitDocument = HydratedDocument<LearningUnit>;
@Schema({ collection: "learning_units", timestamps: true })
export class LearningUnit {
  @Prop({ required: true, unique: true }) slug!: string;
  @Prop({ required: true, enum: ["hanlo_vocabulary"] }) curriculum!: string;
  @Prop({ required: true, min: 1, max: 9 }) level!: number;
  @Prop({ required: true, min: 1 }) order!: number;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) sourceHash!: string;
  @Prop({ type: [LearningWordSchema], required: true }) words!: LearningWord[];
  @Prop({ default: false }) published!: boolean;
}
export const LearningUnitSchema = SchemaFactory.createForClass(LearningUnit);
LearningUnitSchema.index(
  { curriculum: 1, level: 1, order: 1 },
  { unique: true },
);
