/**
 * TASK A11 — vocabulary import CLI.
 *
 *   pnpm --filter api vocab:dry-run            # report only, no writes (default)
 *   pnpm --filter api vocab:import             # actually write (--apply)
 *
 * Flags:
 *   --apply              write to the database (without it: dry-run)
 *   --source <path>      source file, default content/writing.json
 *   --db <uri>           Mongo URI, default MONGODB_URI from the root .env
 *   --collection <name>  target collection, default 'flashcards'
 *
 * The target (database + collection) is printed before anything runs; the
 * write path requires --apply so the target is confirmed explicitly.
 */

import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  extractVocabulary,
  type WritingEntry,
} from '../src/flashcards/import/vocab-extract';
import { applyVocabulary } from '../src/flashcards/import/vocab-apply';

function parseArgs(argv: string[]) {
  const flags = { apply: false, source: 'content/writing.json', db: '', collection: 'flashcards' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--apply') flags.apply = true;
    else if (arg === '--source') flags.source = argv[++i] ?? flags.source;
    else if (arg === '--db') flags.db = argv[++i] ?? flags.db;
    else if (arg === '--collection') flags.collection = argv[++i] ?? flags.collection;
    else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  dotenv.config({ path: join(process.cwd(), '../../.env') });

  const uri = flags.db || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No database: set MONGODB_URI in the root .env or pass --db <uri>.');
    process.exit(1);
  }

  const sourcePath = join(process.cwd(), flags.source);
  const source: WritingEntry[] = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const extraction = extractVocabulary(source);

  console.log(`Source: ${flags.source}`);
  console.log(
    `Extraction: ${extraction.stats.totalCandidates} candidates → ${extraction.stats.uniqueHanzi} unique cards` +
      ` · invalid ${extraction.invalid.length} · duplicate extras ${extraction.stats.extraDuplicates}` +
      ` (cross-level ${extraction.stats.crossLevelDuplicates}) · conflicts ${extraction.stats.conflicts}`,
  );
  if (extraction.invalid.length > 0) {
    console.log('Invalid records:');
    for (const inv of extraction.invalid.slice(0, 20)) console.log(`  #${inv.index} ${inv.hanzi ?? ''} — ${inv.reason}`);
  }
  if (extraction.conflicts.length > 0) {
    console.log(`Conflicts (winner kept, losers reported): ${extraction.conflicts.length}`);
    for (const c of extraction.conflicts.slice(0, 10)) {
      console.log(`  ${c.hanzi}: kept ${c.kept.pinyin}/${c.kept.meaning}@${c.kept.hskLevel}` +
        `, dropped ${c.dropped.map((d) => `${d.pinyin}/${d.meaning}@${d.hskLevel}`).join(' | ')}`);
    }
  }

  const connection = await mongoose.createConnection(uri).asPromise();
  console.log(`\nTarget: ${connection.name}.${flags.collection}  (dry-run: ${!flags.apply})`);

  const report = await applyVocabulary(connection, extraction.cards, {
    dryRun: !flags.apply,
    collection: flags.collection,
  });

  if (report.dryRun) {
    console.log(
      `DRY-RUN — would create ${report.wouldCreate}, would update ${report.wouldUpdate}` +
        `, pre-existing same-hanzi duplicates ${report.preExistingDuplicates.length}` +
        `, errors ${report.errors.length}`,
    );
    console.log('Nothing was written. Re-run with --apply to write.');
  } else {
    console.log(
      `APPLIED — created ${report.created}, updated ${report.updated}` +
        `, pre-existing same-hanzi duplicates ${report.preExistingDuplicates.length}` +
        `, errors ${report.errors.length}`,
    );
  }
  for (const err of report.errors.slice(0, 20)) console.log(`  ${err.hanzi}: ${err.error}`);

  await connection.close();
  if (report.errors.length > 0) process.exit(1);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
