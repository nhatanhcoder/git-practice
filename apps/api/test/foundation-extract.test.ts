import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractFoundation } from '../dist/src/foundation/import/foundation-extract';

/**
 * Foundation/Grammar extractor — pure, no DB, no network.
 * Pins the audited corpus shape (source audit 2026-09-10, D1 hashes):
 * 297 foundation records (21/36/4/6/214/6/6/4) + 76 grammar records
 * (9/9/10/9/7/9/8/8/7, 8 categories), the sound-keyed pinyin rule, and the
 * fail-closed gates (duplicates, bad tone geometry, bad HSK).
 *
 * The real-file counts must keep agreeing with the audit: any drift means the
 * corpus changed without an editorial decision (D1).
 */

const foundationJson = JSON.parse(
  readFileSync(join(process.cwd(), 'content/foundation.json'), 'utf8'),
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const grammarJson: any[] = JSON.parse(
  readFileSync(join(process.cwd(), 'content/grammar.json'), 'utf8'),
);

describe('foundation extract on the real source', () => {
  const result = extractFoundation(foundationJson, grammarJson);

  it('accepts the whole audited corpus with zero invalid rows', () => {
    assert.equal(result.invalid.length, 0);
    assert.equal(result.foundation.length, 297);
    assert.equal(result.grammar.length, 76);
  });

  it('matches the audited per-group and per-level counts', () => {
    assert.deepEqual(result.stats.foundationByGroup, {
      initials: 21,
      finals: 36,
      tones: 4,
      sandhi: 6,
      radicals: 214,
      listening: 6,
      speaking: 6,
      pdfs: 4,
    });
    assert.deepEqual(result.stats.grammarByLevel, {
      '1': 9,
      '2': 9,
      '3': 10,
      '4': 9,
      '5': 7,
      '6': 9,
      '7': 8,
      '8': 8,
      '9': 7,
    });
    assert.equal(result.stats.grammarCategories.length, 8);
  });

  it('keys pinyin by sound (unique across initials+finals), radicals by number', () => {
    const pinyinKeys = result.foundation
      .filter((r) => r.group === 'initials' || r.group === 'finals')
      .map((r) => r.key);
    assert.equal(pinyinKeys.length, 57);
    assert.equal(new Set(pinyinKeys).size, 57);
    assert.ok(pinyinKeys.includes('b'));
    const radicalKeys = result.foundation
      .filter((r) => r.group === 'radicals')
      .map((r) => Number(r.key))
      .sort((a, b) => a - b);
    assert.equal(radicalKeys.length, 214);
    assert.equal(radicalKeys[0], 1);
    assert.equal(radicalKeys[213], 214);
  });

  it('keeps tone geometry as numeric coordinates and grammar tokens as arrays', () => {
    for (const t of result.foundation.filter((r) => r.group === 'tones')) {
      assert.match(String((t.data as Record<string, unknown>).path), /^[\d.,\s]+$/);
    }
    for (const g of result.grammar) {
      assert.ok(Array.isArray((g.data as Record<string, unknown>).tokens));
    }
  });

  it('fails closed: duplicate sounds, bad tone geometry, bad HSK are invalid', () => {
    const dup = extractFoundation(
      { initials: [{ sound: 'b' }, { sound: 'b' }], finals: [], tones: [], sandhi: [], radicals: [], listening: [], speaking: [], pdfs: [] },
      [],
    );
    assert.equal(dup.foundation.length, 1);
    assert.equal(dup.invalid.length, 1);
    assert.match(dup.invalid[0]!.reason, /duplicate key/);

    const badTone = extractFoundation(
      { initials: [], finals: [], tones: [{ id: 1, path: 'M4 10 H44' }], sandhi: [], radicals: [], listening: [], speaking: [], pdfs: [] },
      [],
    );
    assert.equal(badTone.foundation.length, 0);
    assert.match(badTone.invalid[0]!.reason, /unparseable geometry/);

    const badLevel = extractFoundation(
      { initials: [], finals: [], tones: [], sandhi: [], radicals: [], listening: [], speaking: [], pdfs: [] },
      [{ id: 'gx', level: 99, category: 'c', name: 'n', formula: 'f', hanzi: 'h', pinyin: 'p', vi: 'v', note: 'n', key: 'k', tokens: [], frequency: 'x' }],
    );
    assert.equal(badLevel.grammar.length, 0);
    assert.match(badLevel.invalid[0]!.reason, /outside 1–9/);
  });
});
