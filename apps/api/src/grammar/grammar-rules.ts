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
