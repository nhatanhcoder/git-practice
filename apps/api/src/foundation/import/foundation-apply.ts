/**
 * Foundation/Grammar apply — versioned upsert into Mongo.
 * Mirrors the A11 vocab-apply shape: dry-run reports, --apply writes, and
 * re-applying the same input is stable (everything `unchanged`).
 *
 * Versioning rule (D2): rows are keyed (revision, group, key). A new revision
 * ADDS rows; old revisions are never mutated or deleted, so reselecting a
 * previous `content_revisions` row is a complete rollback.
 */
import type { Connection } from 'mongoose';
import { FoundationItemSchema } from '../../mongodb/schemas/foundation-item.schema';
import { GrammarItemSchema } from '../../mongodb/schemas/grammar-item.schema';
import { ContentRevisionSchema } from '../../mongodb/schemas/content-revision.schema';
import type { FoundationExtraction } from './foundation-extract';

export interface FoundationApplyReport {
  dryRun: boolean;
  revision: string;
  wouldCreate: number;
  wouldUpdate: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: Array<{ key: string; error: string }>;
}

function sameData(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function applyFoundation(
  connection: Connection,
  extraction: FoundationExtraction,
  opts: {
    revision: string;
    sourceHashes: { foundation: string; grammar: string };
    counts: Record<string, unknown>;
    dryRun: boolean;
  },
): Promise<FoundationApplyReport> {
  const FoundationItem = connection.model('FoundationItemImport', FoundationItemSchema, 'foundation_items');
  const GrammarItem = connection.model('GrammarItemImport', GrammarItemSchema, 'grammar_items');
  const ContentRevision = connection.model(
    'ContentRevisionImport',
    ContentRevisionSchema,
    'content_revisions',
  );

  const report: FoundationApplyReport = {
    dryRun: opts.dryRun,
    revision: opts.revision,
    wouldCreate: 0,
    wouldUpdate: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  };

  type Op = {
    scope: 'foundation' | 'grammar';
    filter: Record<string, unknown>;
    doc: Record<string, unknown>;
    key: string;
  };
  const ops: Op[] = [];
  for (const r of extraction.foundation) {
    ops.push({
      scope: 'foundation',
      filter: { revision: opts.revision, group: r.group, key: r.key },
      doc: { revision: opts.revision, group: r.group, key: r.key, data: r.data },
      key: `foundation/${r.group}/${r.key}`,
    });
  }
  for (const r of extraction.grammar) {
    ops.push({
      scope: 'grammar',
      filter: { revision: opts.revision, key: r.key },
      doc: {
        revision: opts.revision,
        key: r.key,
        level: r.level,
        category: r.category,
        data: r.data,
      },
      key: `grammar/${r.key}`,
    });
  }

  // Classify create vs update vs unchanged against what is already stored.
  const existing = new Map<string, unknown>();
  const foundationDocs = await FoundationItem.find({ revision: opts.revision })
    .select({ group: 1, key: 1, data: 1 })
    .lean();
  for (const d of foundationDocs) {
    existing.set(`foundation/${d.group}/${d.key}`, d.data);
  }
  const grammarDocs = await GrammarItem.find({ revision: opts.revision })
    .select({ key: 1, data: 1 })
    .lean();
  for (const d of grammarDocs) {
    existing.set(`grammar/${d.key}`, d.data);
  }

  const writes: Array<{ scope: 'foundation' | 'grammar'; op: object }> = [];
  for (const op of ops) {
    const prev = existing.get(op.key);
    if (prev === undefined) {
      if (opts.dryRun) report.wouldCreate++;
      else
        writes.push({
          scope: op.scope,
          op: { updateOne: { filter: op.filter, update: { $set: op.doc }, upsert: true } },
        });
    } else if (!sameData(prev, op.doc.data)) {
      if (opts.dryRun) report.wouldUpdate++;
      else
        writes.push({
          scope: op.scope,
          op: { updateOne: { filter: op.filter, update: { $set: op.doc }, upsert: true } },
        });
    } else {
      report.unchanged++;
    }
  }

  if (!opts.dryRun && writes.length > 0) {
    try {
      const foundationWrites = writes
        .filter((w) => w.scope === 'foundation')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((w) => w.op as any);
      const grammarWrites = writes
        .filter((w) => w.scope === 'grammar')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((w) => w.op as any);
      if (foundationWrites.length > 0) {
        const res = await FoundationItem.bulkWrite(foundationWrites, { ordered: false });
        report.created += res.upsertedCount;
        report.updated += res.modifiedCount;
      }
      if (grammarWrites.length > 0) {
        const res = await GrammarItem.bulkWrite(grammarWrites, { ordered: false });
        report.created += res.upsertedCount;
        report.updated += res.modifiedCount;
      }
    } catch (err) {
      report.errors.push({ key: '*', error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Revision bookkeeping — one row per (name, revision), upserted, never deleted.
  // (Counted separately from catalog records: a revision row is bookkeeping, not content.)
  for (const name of ['foundation', 'grammar'] as const) {
    const filter = { name, revision: opts.revision };
    if (opts.dryRun) {
      const present = await ContentRevision.exists(filter);
      if (!present) report.wouldCreate++;
    } else {
      await ContentRevision.updateOne(
        filter,
        {
          $setOnInsert: {
            name,
            revision: opts.revision,
            sourceHash: opts.sourceHashes[name],
            counts: opts.counts,
            importedAt: new Date(),
          },
        },
        { upsert: true },
      );
    }
  }

  return report;
}
