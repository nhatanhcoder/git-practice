import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Import bookkeeping for the versioned self-study catalogs — MongoDB.
 * Source: docs/api/modules/student/02-foundation-grammar.md §1 (D2-approved).
 *
 * One row per applied (name, revision). Readers resolve "current" as the
 * latest row per name and pin every query to its revision, so a mid-import
 * state can never repaint half of a page. Rollback = reselecting a previous
 * row, never deleting learner progress.
 */
export type ContentRevisionDocument = HydratedDocument<ContentRevision>;

@Schema({ collection: 'content_revisions', timestamps: true })
export class ContentRevision {
  @Prop({ required: true, enum: ['foundation', 'grammar'], index: true })
  name!: string;

  @Prop({ required: true })
  revision!: string;

  /** Full SHA-256 of the source file(s) this revision was built from (D1). */
  @Prop({ required: true })
  sourceHash!: string;

  /** Per-group (foundation) or per-level (grammar) record counts. */
  @Prop({ type: Object, required: true, default: {} })
  counts!: Record<string, unknown>;

  @Prop({ required: true, default: () => new Date() })
  importedAt!: Date;
}

export const ContentRevisionSchema = SchemaFactory.createForClass(ContentRevision);
ContentRevisionSchema.index({ name: 1, revision: 1 }, { unique: true });
