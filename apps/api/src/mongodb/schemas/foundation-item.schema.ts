import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * One Foundation catalog record — MongoDB.
 * Source: docs/api/modules/student/02-foundation-grammar.md §1 (D2-approved).
 *
 * The catalog is versioned and immutable: an import never updates a row, it
 * writes a new `revision` and the readers always serve one pinned revision.
 * `data` keeps the audited source fields verbatim (see the source audit) —
 * no invented tips, variants or examples live here.
 */
export const FOUNDATION_GROUPS = [
  'initials',
  'finals',
  'tones',
  'sandhi',
  'radicals',
  'listening',
  'speaking',
  'pdfs',
] as const;

export type FoundationGroup = (typeof FOUNDATION_GROUPS)[number];

export type FoundationItemDocument = HydratedDocument<FoundationItem>;

@Schema({ collection: 'foundation_items', timestamps: true })
export class FoundationItem {
  /** Short hash of the imported source files — the published version pin. */
  @Prop({ required: true, index: true })
  revision!: string;

  @Prop({ required: true, enum: FOUNDATION_GROUPS, index: true })
  group!: string;

  /**
   * Stable identity: the source `id` for every group except `radicals`,
   * which uses the source `no` (1–214, contiguous per the audit).
   */
  @Prop({ required: true })
  key!: string;

  /** Audited source fields verbatim (Mixed — the eight groups differ). */
  @Prop({ type: Object, required: true })
  data!: Record<string, unknown>;
}

export const FoundationItemSchema = SchemaFactory.createForClass(FoundationItem);
// The importer's enforcement point: re-applying the same revision is a
// no-op match, never a duplicate row.
FoundationItemSchema.index({ revision: 1, group: 1, key: 1 }, { unique: true });
FoundationItemSchema.index({ group: 1, key: 1 });
