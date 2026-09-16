/**
 * Grammar pure rules — 02-foundation-grammar.md §1/§6.
 *
 * No Nest, no database. The category set is read from the source at import
 * time, never hardcoded here: hardcoding eight Vietnamese category names in
 * code is how a re-categorised corpus silently stops matching.
 */

export interface ValidGrammarRecord {
  key: string;
  level: number;
  category: string;
  data: Record<string, unknown>;
}

/** Source fields every grammar record must carry (audit § Inventory). */
const REQUIRED_FIELDS = [
  'id',
  'level',
  'category',
  'name',
  'formula',
  'hanzi',
  'pinyin',
  'vi',
  'note',
  'key',
  'tokens',
  'frequency',
] as const;

/**
 * Structural gate for one source row. HSK is 1–9 (DOC-004); `tokens` must be
 * an array (a future reorder exercise needs token identity — §6 — but even
 * today a non-array token field is corrupt data, not a variant).
 */
export function validateGrammarRecord(
  row: unknown,
): { ok: true; record: ValidGrammarRecord } | { ok: false; reason: string } {
  if (!row || typeof row !== 'object') return { ok: false, reason: 'not an object' };
  const r = row as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (r[field] === undefined || r[field] === null || r[field] === '') {
      return { ok: false, reason: `missing required field \`${field}\`` };
    }
  }
  if (typeof r.id !== 'string') return { ok: false, reason: 'non-string `id`' };
  if (!Number.isInteger(r.level) || (r.level as number) < 1 || (r.level as number) > 9) {
    return { ok: false, reason: `id=${r.id} has HSK level outside 1–9` };
  }
  if (!Array.isArray(r.tokens)) {
    return { ok: false, reason: `id=${r.id} has non-array \`tokens\`` };
  }
  if (typeof r.category !== 'string' || typeof r.name !== 'string') {
    return { ok: false, reason: `id=${r.id} has non-string category/name` };
  }
  return {
    ok: true,
    record: { key: r.id, level: r.level as number, category: r.category, data: { ...r } },
  };
}

/** Stable list order (02 §2): level asc, then source id asc. */
export function compareGrammar(a: { level: number; key: string }, b: { level: number; key: string }): number {
  if (a.level !== b.level) return a.level - b.level;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * The reorder exercise (option-A port). Accepted answer is the source token
 * order (exact array equality) — alternate word orders are NOT accepted because
 * the source records exactly one segmentation and no alternates were reviewed
 * (module §6). `tokens` is the source's own word segmentation; the audit
 * verified concatenated tokens match the example hanzi for all 76 records.
 */
export function isCorrectReorder(sourceTokens: string[], answer: string[]): boolean {
  if (!Array.isArray(answer) || answer.length !== sourceTokens.length) return false;
  return answer.every((token, i) => token === sourceTokens[i]);
}

/**
 * Deterministic shuffle for the token bank: same point always yields the same
 * scramble (a reload mid-exercise must not reshuffle the bank under the
 * learner's draft answer — module §8's "preserve the user's draft").
 * Seed = the point id.
 */
export function shuffledTokens(sourceId: string, sourceTokens: string[]): string[] {
  let h = 0;
  for (const ch of sourceId) h = (Math.imul(31, h) + (ch.codePointAt(0) ?? 0)) | 0;
  const tokens = [...sourceTokens];
  for (let i = tokens.length - 1; i > 0; i--) {
    h = (Math.imul(h, 16777619) + 1013904223) | 0;
    const j = Math.abs(h) % (i + 1);
    [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
  }
  return tokens;
}

/**
 * Pinyin diacritic folding for search ("shi" finds "shì" — typed queries are
 * usually bare ASCII on Vietnamese keyboards). Display strings are never
 * folded; only the comparison is. Implemented via NFD decomposition (no
 * hand-listed combining marks in a character class) with explicit pre-mapping
 * for the ü-series, which folds to `v` (pinyin convention), not `u`.
 */
export function stripPinyinDiacritics(s: string): string {
  return s
    .replace(/[ǖǘǚǜü]/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Case-insensitive match over name/formula/hanzi/pinyin/vi (pinyin folded). */
export function matchesGrammarSearch(
  item: { name: string; formula: string; hanzi: string; pinyin: string; vi: string },
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const foldedQ = stripPinyinDiacritics(q);
  const haystacks = [
    item.name.toLowerCase(),
    item.formula.toLowerCase(),
    item.hanzi.toLowerCase(),
    stripPinyinDiacritics(item.pinyin).toLowerCase(),
    item.vi.toLowerCase(),
  ];
  return haystacks.some((h) => h.includes(q) || h.includes(foldedQ));
}

/**
 * List/detail projection: everything descriptive EXCEPT `tokens` (the reorder
 * answer — it travels only inside the shuffled practice payload, §3).
 */
export function toListItem(data: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...data };
  delete rest.tokens;
  return rest;
}
