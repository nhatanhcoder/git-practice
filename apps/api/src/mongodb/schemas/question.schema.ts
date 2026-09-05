import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Question — MongoDB. Source: docs/entities/mongodb/ENTITY_QUESTION.md.
 *
 * It lives in Mongo and not Postgres for the reason the entity spec gives: nine
 * sub-types with genuinely different shapes. A listening question carries audio
 * and a transcript, a reading question a passage, a writing question a rubric and
 * no correct answer at all. Modelling that relationally means either nine tables
 * or one table that is mostly NULL.
 *
 * ⚠️ DEBT-001 applies directly here. `Assignment.questionIds[]` lives in Postgres
 * and references these `_id`s as strings, and there is no transaction spanning the
 * two stores. Anything that writes both must tolerate half of it failing.
 */

export type QuestionSkill = 'listening' | 'reading' | 'writing';

/** The nine sub-types, grouped by skill exactly as ENTITY_QUESTION.md lists them. */
export const SUB_TYPES_BY_SKILL: Record<QuestionSkill, readonly string[]> = {
  listening: ['multiple_choice_single', 'true_false_not_given', 'short_answer'],
  reading: ['multiple_choice_multi', 'fill_in_blank', 'sentence_ordering', 'matching'],
  writing: ['sentence_construction', 'essay'],
} as const;

export const ALL_SUB_TYPES = Object.values(SUB_TYPES_BY_SKILL).flat();

export type QuestionDocument = HydratedDocument<Question>;

@Schema({ _id: false })
export class QuestionContent {
  /** Listening. Supabase Storage URL per ENTITY_QUESTION.md, not a local path. */
  @Prop() audioUrl?: string;
  @Prop() transcript?: string;
  /** Reading. */
  @Prop() passage?: string;
  /** Writing. */
  @Prop() prompt?: string;
  @Prop() rubric?: string;
}

@Schema({ _id: false })
export class QuestionOption {
  /** Stable id ('A', 'B', …). `correctAnswer` references these, never the text —
   *  WEB-006 B2 shipped options as bare strings and an answer of "A + B" that no
   *  comparison could ever match. */
  @Prop({ required: true }) id!: string;
  @Prop({ required: true }) text!: string;
}

@Schema({ collection: 'questions', timestamps: true })
export class Question {
  @Prop({ required: true, enum: ['listening', 'reading', 'writing'], index: true })
  skill!: QuestionSkill;

  @Prop({ required: true, enum: ALL_SUB_TYPES })
  subType!: string;

  /** HSK 1–9. Never 1–6 — DOC-004, settled 2026-08-11. */
  @Prop({ required: true, min: 1, max: 9, index: true })
  hskLevel!: number;

  @Prop({ required: true, enum: ['easy', 'medium', 'hard'], default: 'medium' })
  difficulty!: 'easy' | 'medium' | 'hard';

  @Prop({ type: QuestionContent, default: {} })
  content!: QuestionContent;

  @Prop({ type: [QuestionOption], default: undefined })
  options?: QuestionOption[];

  /**
   * `string` for single MCQ, `string[]` for multi / ordering / matching, `null`
   * for writing. Mixed on purpose: the entity spec defines it that way, and
   * flattening a multi-answer into one string is the bug WEB-006 recorded.
   */
  @Prop({ type: Object, default: null })
  correctAnswer!: string | string[] | null;

  @Prop({ type: String, default: null })
  explanation!: string | null;

  /** Postgres User uuid of the teacher. Cross-store reference, so no populate. */
  @Prop({ required: true, index: true })
  createdBy!: string;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

/** The list screen filters on all three at once; a single compound index serves it. */
QuestionSchema.index({ createdBy: 1, skill: 1, hskLevel: 1 });
