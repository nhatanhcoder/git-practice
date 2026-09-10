import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractVocabulary,
  type WritingEntry,
} from '../dist/src/flashcards/import/vocab-extract';

/**
 * TASK A11 — pure extractor tests. No DB, no network: these pin the mapping,
 * validation and dedup rules recorded in docs/content/VOCAB_SOURCE_AUDIT.md §6.
 *
 * The real-file counts were independently computed by the A10 audit
 * (throwaway script) and by the A11 dedup preview — they must keep agreeing:
 * 1,228 candidates → 1,119 unique cards, 80 extra exact dups (15 cross-level),
 * 29 conflicting hanzi, per-level 922/50/40/32/25/16/12/11/11.
 */

const realSource: WritingEntry[] = JSON.parse(
  readFileSync(join(process.cwd(), 'content/writing.json'), 'utf8'),
);

describe('A11 · extractVocabulary on the real source', () => {
  const result = extractVocabulary(realSource);

  it('produces the audited candidate and unique counts', () => {
    assert.equal(result.stats.totalCandidates, 1228);
    assert.equal(result.stats.uniqueHanzi, 1119);
    assert.equal(result.cards.length, 1119);
    assert.equal(result.invalid.length, 0);
  });

  it('matches the audited duplicate and conflict counts', () => {
    assert.equal(result.stats.extraDuplicates, 80);
    assert.equal(result.stats.crossLevelDuplicates, 15);
    assert.equal(result.stats.conflicts, 29);
    assert.equal(result.duplicates.length + result.conflicts.length > 0, true);
  });

  it('matches the audited per-level card distribution', () => {
    const perLevel: Record<number, number> = {};
    for (const c of result.cards) perLevel[c.hskLevel] = (perLevel[c.hskLevel] ?? 0) + 1;
    assert.deepEqual(perLevel, { 1: 922, 2: 50, 3: 40, 4: 32, 5: 25, 6: 16, 7: 12, 8: 11, 9: 11 });
  });

  it('has exactly one card per hanzi', () => {
    const seen = new Set(result.cards.map((c) => c.hanzi));
    assert.equal(seen.size, result.cards.length);
  });

  it('maps fields exactly per the audit: vi→meaning, level inherited, hanlo tag, no example fields', () => {
    const sample = result.cards.find((c) => c.hanzi === '人们');
    assert.ok(sample);
    assert.equal(sample!.hskLevel, 1);
    assert.equal(sample!.pinyin, 'rénmen');
    assert.equal(sample!.meaning, 'mọi người');
    assert.deepEqual(sample!.tags, ['hanlo']);
    const bare = sample as Record<string, unknown>;
    assert.equal('exampleSentence' in bare, false);
    assert.equal('audioUrl' in bare, false);
  });
});

describe('A11 · validation (synthetic)', () => {
  it('rejects records missing hanzi, pinyin or meaning with per-record reasons', () => {
    const source: WritingEntry[] = [
      {
        id: 'ch-x', char: '好', pinyin: 'hǎo', vi: 'tốt', level: 1,
        words: [
          { hanzi: '', pinyin: 'p', vi: 'nghĩa' },          // empty hanzi
          { hanzi: '测试', pinyin: '', vi: 'nghĩa' },        // empty pinyin
          { hanzi: '测试', pinyin: 'p', vi: '   ' },         // blank meaning
        ],
      } as unknown as WritingEntry,
    ];
    const result = extractVocabulary(source);
    assert.equal(result.invalid.length, 3);
    for (const inv of result.invalid) assert.ok(inv.reason.length > 0);
    assert.equal(result.cards.length, 0);
  });

  it('rejects an out-of-range level', () => {
    const source: WritingEntry[] = [
      {
        id: 'ch-y', char: '好', pinyin: 'hǎo', vi: 'tốt', level: 12,
        words: [{ hanzi: '好', pinyin: 'hǎo', vi: 'tốt' }],
      } as unknown as WritingEntry,
    ];
    const result = extractVocabulary(source);
    assert.equal(result.invalid.length, 1);
    assert.match(result.invalid[0]!.reason, /level/i);
  });

  it('survives a word list that is missing entirely', () => {
    const source = [{ id: 'ch-z', char: '好', pinyin: 'h', vi: 't', level: 1 }] as unknown as WritingEntry[];
    const result = extractVocabulary(source);
    assert.equal(result.stats.totalCandidates, 0);
    assert.equal(result.cards.length, 0);
  });
});

describe('A11 · dedup and conflict policy (synthetic)', () => {
  const base = { id: 'c', char: 'x', pinyin: 'px', vi: 'vx' };

  it('collapses exact duplicates and reports the extras', () => {
    const source: WritingEntry[] = [
      { ...base, level: 1, words: [{ hanzi: '一样', pinyin: 'yīyàng', vi: 'như nhau' }] },
      { ...base, level: 2, words: [{ hanzi: '一样', pinyin: 'yīyàng', vi: 'như nhau' }] },
    ] as unknown as WritingEntry[];
    const result = extractVocabulary(source);
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0]!.hskLevel, 1, 'keeps the lowest level');
    assert.equal(result.stats.extraDuplicates, 1);
    assert.equal(result.stats.crossLevelDuplicates, 1);
    const dup = result.duplicates.find((d) => d.hanzi === '一样');
    assert.ok(dup);
    assert.equal(dup!.extraCount, 1);
    assert.deepEqual(dup!.levels, [1, 2]);
  });

  it('keeps a deterministic winner for conflicts and reports every loser', () => {
    const source: WritingEntry[] = [
      { ...base, level: 3, words: [{ hanzi: '你好', pinyin: 'nǐ hǎo', vi: 'xin chào' }] },
      { ...base, level: 1, words: [{ hanzi: '你好', pinyin: 'nǐhǎo', vi: 'chào' }] },
    ] as unknown as WritingEntry[];
    const result = extractVocabulary(source);
    assert.equal(result.cards.length, 1);
    const card = result.cards[0]!;
    assert.equal(card.hskLevel, 1, 'lowest level wins');
    assert.equal(card.pinyin, 'nǐhǎo', 'source-order tiebreak within the level');
    const conflict = result.conflicts.find((c) => c.hanzi === '你好');
    assert.ok(conflict);
    assert.equal(conflict!.dropped.length, 1);
    assert.equal(conflict!.dropped[0]!.hskLevel, 3);
  });

  it('is deterministic under input reordering (level-first ordering is the invariant)', () => {
    const a: WritingEntry[] = [
      { ...base, level: 1, words: [{ hanzi: 'w', pinyin: 'p1', vi: 'v1' }, { hanzi: 'w', pinyin: 'p2', vi: 'v2' }] },
      { ...base, level: 2, words: [{ hanzi: 'w', pinyin: 'p3', vi: 'v3' }] },
    ] as unknown as WritingEntry[];
    const b = [...a].reverse();
    const ra = extractVocabulary(a);
    const rb = extractVocabulary(b);
    assert.deepEqual(ra.cards, rb.cards);
    assert.equal(ra.cards[0]!.pinyin, 'p1');
  });
});
