/**
 * TASK A11 — the write side of the vocabulary import.
 *
 * Safety rules (docs/prompts/student-integration-checklist.md A11, and
 * docs/content/VOCAB_SOURCE_AUDIT.md §5/§6):
 *  - DRY-RUN BY DEFAULT. Writes happen only when opts.dryRun === false.
 *  - Upsert keyed by hanzi alone (any level): a card whose level changed in
 *    the source updates the existing document instead of creating a second
 *    row — this is what keeps reruns free of cross-level duplicates.
 *  - _id of an existing card is never replaced (no delete-and-recreate), so
 *    user_flashcard_states references survive an import untouched.
 *  - This module never reads or writes user_flashcard_states.
 *  - Pre-existing same-hanzi duplicates in the target collection are
 *    reported (preExistingDuplicates), never silently merged away.
 */

import type { Connection, Model } from 'mongoose';
import { FlashcardSchema } from '../../mongodb/schemas/flashcard.schema';
import type { ImportCard } from './vocab-extract';

export type { ImportCard };
type ImportFlashcardDoc = {
  _id: unknown;
};

export interface ApplyOptions {
  dryRun: boolean;
  /** Target collection; defaults to the production 'flashcards'. */
  collection?: string;
  /** Mongoose model name to register on the connection; defaults to 'FlashcardImport'. */
  modelName?: string;
}

export interface ApplyError {
  hanzi: string;
  error: string;
}

export interface ApplyReport {
  dryRun: boolean;
  target: string;
  totalCards: number;
  created: number;
  updated: number;
  wouldCreate: number;
  wouldUpdate: number;
  preExistingDuplicates: { hanzi: string; count: number }[];
  errors: ApplyError[];
}

export function getImportModel(
  connection: Connection,
  collection = 'flashcards',
  modelName = 'FlashcardImport',
): Model<ImportFlashcardDoc> {
  return connection.model(modelName, FlashcardSchema, collection) as unknown as Model<ImportFlashcardDoc>;
}

export async function applyVocabulary(
  connection: Connection,
  cards: ImportCard[],
  opts: ApplyOptions,
): Promise<ApplyReport> {
  const collectionName = opts.collection ?? 'flashcards';
  const model = getImportModel(connection, collectionName, opts.modelName);

  const report: ApplyReport = {
    dryRun: opts.dryRun,
    target: `${connection.name}.${collectionName}`,
    totalCards: cards.length,
    created: 0,
    updated: 0,
    wouldCreate: 0,
    wouldUpdate: 0,
    preExistingDuplicates: [],
    errors: [],
  };

  for (const card of cards) {
    // One retry per card for connection-class blips: over ~1.1k sequential
    // ops against Atlas a monitor/pool blip occasionally fails exactly one
    // op. A single retry heals it; anything still failing is reported and
    // the rerun (idempotent) is the documented recovery path (A11 rule 7).
    const runCard = async (): Promise<void> => {
      // Lookup by hanzi alone — see the header comment for why.
      const existing = await model.find({ hanzi: card.hanzi }).sort({ hskLevel: 1 }).exec();

      if (existing.length === 0) {
        if (opts.dryRun) {
          report.wouldCreate++;
        } else {
          await model.create({
            hskLevel: card.hskLevel,
            hanzi: card.hanzi,
            pinyin: card.pinyin,
            meaning: card.meaning,
            tags: card.tags,
          });
          report.created++;
        }
        return;
      }

      if (existing.length > 1) {
        report.preExistingDuplicates.push({ hanzi: card.hanzi, count: existing.length });
      }

      // Update the first match in place: _id stays, SRS references stay.
      if (opts.dryRun) {
        report.wouldUpdate++;
      } else {
        await model.updateOne(
          { _id: existing[0]!._id },
          { $set: { hskLevel: card.hskLevel, pinyin: card.pinyin, meaning: card.meaning, tags: card.tags } },
        );
        report.updated++;
      }
    };

    try {
      await runCard();
    } catch {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await runCard();
      } catch (err) {
        report.errors.push({
          hanzi: card.hanzi,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return report;
}
