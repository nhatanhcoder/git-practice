import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
export type UserLearningProgressDocument =
  HydratedDocument<UserLearningProgress>;
@Schema({ collection: "user_learning_progress", timestamps: true })
export class UserLearningProgress {
  @Prop({ required: true }) userId!: string;
  @Prop({ required: true }) unitSlug!: string;
  @Prop({ enum: ["in_progress", "completed"], default: "in_progress" })
  status!: "in_progress" | "completed";
  @Prop({ default: 0 }) studyIndex!: number;
  @Prop({ type: [String], default: [] }) answers!: string[];
  @Prop({ default: 1 }) revision!: number;
  @Prop({ default: 0 }) bestScore!: number;
  @Prop({ type: Number, default: null }) lastScore!: number | null;
  @Prop({ type: Date, required: true }) startedAt!: Date;
  @Prop({ type: Date, default: null }) completedAt!: Date | null;
}
export const UserLearningProgressSchema =
  SchemaFactory.createForClass(UserLearningProgress);
UserLearningProgressSchema.index({ userId: 1, unitSlug: 1 }, { unique: true });
