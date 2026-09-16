/**
 * Foundation/Grammar import CLI — 02-foundation-grammar.md §12.
 *
 *   pnpm --filter api foundation:dry-run            # report only, no writes (default)
 *   pnpm --filter api foundation:import             # actually write (--apply)
 *
 * Flags:
 *   --apply                  write to the database (without it: dry-run)
 *   --foundation <path>      source file, default content/foundation.json
 *   --grammar <path>         source file, default content/grammar.json
 *   --db <uri>               Mongo URI, default MONGODB_URI from the root .env
 *
 * The revision is the first 12 hex chars of SHA-256(foundation.json + grammar.json):
 * re-running the same files reproduces the same revision, so re-apply is stable
 * by construction. Fails closed on invalid rows (D1) — a rejected row needs an
 * editorial decision, not a quiet skip.
 */

import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { extractFoundation } from '../src/foundation/import/foundation-extract';
import { applyFoundation } from '../src/foundation/import/foundation-apply';

function parseArgs(argv: string[]) {
  const flags = {
    apply: false,
    foundation: 'content/foundation.json',
    grammar: 'content/grammar.json',
    db: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--apply') flags.apply = true;
    else if (arg === '--foundation') flags.foundation = argv[++i] ?? flags.foundation;
    else if (arg === '--grammar') flags.grammar = argv[++i] ?? flags.grammar;
    else if (arg === '--db') flags.db = argv[++i] ?? flags.db;
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

  const foundationRaw = readFileSync(join(process.cwd(), flags.foundation), 'utf8');
  const grammarRaw = readFileSync(join(process.cwd(), flags.grammar), 'utf8');
  const foundationHash = createHash('sha256').update(foundationRaw).digest('hex');
  const grammarHash = createHash('sha256').update(grammarRaw).digest('hex');
  // The revision pins file bytes AND the key scheme: changing how rows are
  // keyed (v1: ordinal source ids for sounds → v2: sound-keyed pinyin) mints a
  // new revision instead of mixing two key generations under one pin. Old
  // revisions stay stored and reselectable (D2 rollback), never served.
  const KEY_SCHEME = 'key-scheme:2';
  const revision = createHash('sha256')
    .update(foundationRaw + grammarRaw + KEY_SCHEME)
    .digest('hex')
    .slice(0, 12);

  // D1 provenance gate: the files must be the adopted corpus, byte for byte.
  const D1_FOUNDATION = '97541d9f10a404d621432f2f0b2205ff68f621422c5230fe2d911b5e47351bc0';
  const D1_GRAMMAR = '5f4b886c095ce47e3e970469bfdc89f7813ed905928bc0267712f8542cc0d19f';
  if (foundationHash !== D1_FOUNDATION || grammarHash !== D1_GRAMMAR) {
    console.error(
      'Source hash mismatch — these are not the D1-adopted files. ' +
        `foundation: ${foundationHash} (want ${D1_FOUNDATION}); ` +
        `grammar: ${grammarHash} (want ${D1_GRAMMAR}). Refusing to import.`,
    );
    process.exit(1);
  }

  const extraction = extractFoundation(JSON.parse(foundationRaw), JSON.parse(grammarRaw));
  console.log(`Source: ${flags.foundation} + ${flags.grammar}  (revision ${revision})`);
  console.log(
    `Foundation: ${extraction.foundation.length} records ` +
      JSON.stringify(extraction.stats.foundationByGroup),
  );
  console.log(
    `Grammar: ${extraction.grammar.length} records, ` +
      `levels ${JSON.stringify(extraction.stats.grammarByLevel)}, ` +
      `${extraction.stats.grammarCategories.length} categories`,
  );
  if (extraction.invalid.length > 0) {
    console.log(`Invalid records: ${extraction.invalid.length}`);
    for (const inv of extraction.invalid.slice(0, 20)) {
      console.log(`  ${inv.scope}/${inv.group}#${inv.index} — ${inv.reason}`);
    }
    console.error('Refusing to import with invalid rows (D1: needs an editorial decision).');
    process.exit(1);
  }

  const connection = await mongoose.createConnection(uri).asPromise();
  console.log(`\nTarget: ${connection.name}  (dry-run: ${!flags.apply})`);

  const report = await applyFoundation(connection, extraction, {
    revision,
    sourceHashes: { foundation: foundationHash, grammar: grammarHash },
    counts: {
      foundationByGroup: extraction.stats.foundationByGroup,
      grammarByLevel: extraction.stats.grammarByLevel,
    },
    dryRun: !flags.apply,
  });

  if (report.dryRun) {
    console.log(
      `DRY-RUN — would create ${report.wouldCreate}, would update ${report.wouldUpdate}, ` +
        `already current ${report.unchanged}, errors ${report.errors.length}`,
    );
    console.log('Nothing was written. Re-run with --apply to write.');
  } else {
    console.log(
      `APPLIED — created ${report.created}, updated ${report.updated}, ` +
        `unchanged ${report.unchanged}, errors ${report.errors.length}`,
    );
  }
  for (const err of report.errors.slice(0, 20)) console.log(`  ${err.key}: ${err.error}`);

  await connection.close();
  if (report.errors.length > 0) process.exit(1);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
