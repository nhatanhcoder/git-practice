import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * One Grammar catalog record — MongoDB.
 * Source: docs/api/modules/student/02-foundation-grammar.md §1 (D2-approved).
 *
 * Same versioning rule as FoundationItem: imports write new revisions, readers
 * serve one pinned revision. `data` keeps the audited source fields verbatim
 * (id, level, category, name, formula, hanzi, pinyin, vi, note, key, tokens,
 * frequency) — the eight source categories are preserved as-is, never silently
 * cast into the FE's six-category mock type.
 */
export type GrammarItemDocument = HydratedDocument<GrammarItem>;

@Schema({ collection: 'grammar_items', timestamps: true })
export class GrammarItem {
  /** Short hash of the imported source files — the published version pin. */
  @Prop({ required: true, index: true })
  revision!: string;

  /** The source `id` (e.g. `g001`) — stable across imports (D1 keeps repeats). */
  @Prop({ required: true })
  key!: string;

  /** HSK 1–9, denormalised for the list query. Never 1–6 — DOC-004. */
  @Prop({ required: true, min: 1, max: 9, index: true })
  level!: number;

  /** Source category verbatim (8 values) — denormalised for the list query. */
  @Prop({ required: true, index: true })
  category!: string;

  @Prop({ type: Object, required: true })
  data!: Record<string, unknown>;
}

export const GrammarItemSchema = SchemaFactory.createForClass(GrammarItem);
GrammarItemSchema.index({ revision: 1, key: 1 }, { unique: true });
GrammarItemSchema.index({ level: 1, category: 1 });
