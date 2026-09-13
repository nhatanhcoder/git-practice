/**
 * TASK A11 — pure extraction of Flashcard seed data from the Hán Lộ
 * `writing.json` corpus copy (`apps/api/content/writing.json`).
 *
 * Rules are those recorded in docs/content/VOCAB_SOURCE_AUDIT.md §6:
 *  - seed = the `words[]` embedded in each character entry (1,228 candidates);
 *  - dedup key = hanzi; winner = lowest level, then source order;
 *  - every duplicate and conflict is reported, nothing silently dropped;
 *  - mapping: vi → meaning, level inherited from the parent character entry,
 *    tags ["hanlo"], no example/audio fields (the corpus has none);
 *  - upserts by hanzi alone so a later level change updates instead of
 *    creating a cross-level duplicate (enforced by vocab-apply, not here).
 *
 * This module is deliberately free of Nest/Mongoose imports so it can run
 * under plain `node --test`.
 */

export interface WritingWord {
  hanzi: string;
  pinyin: string;
  vi: string;
}

export interface WritingEntry {
  id: string;
  char: string;
  pinyin: string;
  vi: string;
  level: number;
  words?: WritingWord[];
}

export interface ImportCard {
  hskLevel: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  tags: string[];
}

export interface InvalidRecord {
  index: number;
  hanzi?: string;
  reason: string;
}

export interface DuplicateGroup {
  hanzi: string;
  keptLevel: number;
  extraCount: number;
  levels: number[];
}

export interface DroppedVariant {
  pinyin: string;
  meaning: string;
  hskLevel: number;
  sourceChar: string;
}

export interface ConflictGroup {
  hanzi: string;
  kept: { pinyin: string; meaning: string; hskLevel: number; sourceChar: string };
  dropped: DroppedVariant[];
}

export interface ExtractionStats {
  totalCandidates: number;
  uniqueHanzi: number;
  extraDuplicates: number;
  crossLevelDuplicates: number;
  conflicts: number;
}

export interface ExtractionResult {
  cards: ImportCard[];
  invalid: InvalidRecord[];
  duplicates: DuplicateGroup[];
  conflicts: ConflictGroup[];
  stats: ExtractionStats;
}

const HSK_MIN = 1;
const HSK_MAX = 9;

export function extractVocabulary(source: WritingEntry[]): ExtractionResult {
  interface Candidate {
    hanzi: string;
    pinyin: string;
    meaning: string;
    hskLevel: number;
    sourceChar: string;
    index: number;
  }

  const invalid: InvalidRecord[] = [];
  const candidates: Candidate[] = [];
  let index = 0;

  for (const entry of source) {
    const words = entry.words ?? [];
    for (const word of words) {
      index++;
      const hanzi = typeof word.hanzi === 'string' ? word.hanzi.trim() : '';
      const pinyin = typeof word.pinyin === 'string' ? word.pinyin.trim() : '';
      const meaning = typeof word.vi === 'string' ? word.vi.trim() : '';
      const level = entry.level;

      if (!hanzi) {
        invalid.push({ index, reason: 'hanzi bị rỗng' });
        continue;
      }
      if (!pinyin) {
        invalid.push({ index, hanzi, reason: 'pinyin bị rỗng' });
        continue;
      }
      if (!meaning) {
        invalid.push({ index, hanzi, reason: 'meaning (vi) bị rỗng' });
        continue;
      }
      if (
        !Number.isInteger(level) ||
        level < HSK_MIN ||
        level > HSK_MAX
      ) {
        invalid.push({ index, hanzi, reason: `level ngoài 1–9: ${level}` });
        continue;
      }
      candidates.push({ hanzi, pinyin, meaning, hskLevel: level, sourceChar: entry.char, index });
    }
  }

  // Group by hanzi; within a group the winner is the lowest level, and among
  // equal levels the earliest source order (smallest candidate index).
  const byHanzi = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (!byHanzi.has(c.hanzi)) byHanzi.set(c.hanzi, []);
    byHanzi.get(c.hanzi)!.push(c);
  }
  for (const list of byHanzi.values()) {
    list.sort((a, b) => a.hskLevel - b.hskLevel || a.index - b.index);
  }

  const cards: ImportCard[] = [];
  const duplicates: DuplicateGroup[] = [];
  const conflicts: ConflictGroup[] = [];
  let extraDuplicates = 0;
  let crossLevelDuplicates = 0;

  for (const [hanzi, list] of byHanzi) {
    const winner = list[0]!;
    const exactSame = list.filter(
      (c) => c.pinyin === winner.pinyin && c.meaning === winner.meaning,
    );
    const losers = list.filter((c) => c !== winner);

    if (exactSame.length > 1) {
      extraDuplicates += exactSame.length - 1;
      const levels = [...new Set(exactSame.map((c) => c.hskLevel))].sort((a, b) => a - b);
      if (levels.length > 1) crossLevelDuplicates++;
      duplicates.push({
        hanzi,
        keptLevel: winner.hskLevel,
        extraCount: exactSame.length - 1,
        levels,
      });
    }

    const conflicting = losers.filter(
      (c) => c.pinyin !== winner.pinyin || c.meaning !== winner.meaning,
    );
    if (conflicting.length > 0) {
      conflicts.push({
        hanzi,
        kept: {
          pinyin: winner.pinyin,
          meaning: winner.meaning,
          hskLevel: winner.hskLevel,
          sourceChar: winner.sourceChar,
        },
        dropped: conflicting.map((c) => ({
          pinyin: c.pinyin,
          meaning: c.meaning,
          hskLevel: c.hskLevel,
          sourceChar: c.sourceChar,
        })),
      });
    }

    cards.push({
      hskLevel: winner.hskLevel,
      hanzi: winner.hanzi,
      pinyin: winner.pinyin,
      meaning: winner.meaning,
      tags: ['hanlo'],
    });
  }

  return {
    cards,
    invalid,
    duplicates,
    conflicts,
    stats: {
      totalCandidates: index,
      uniqueHanzi: cards.length,
      extraDuplicates,
      crossLevelDuplicates,
      conflicts: conflicts.length,
    },
  };
}
