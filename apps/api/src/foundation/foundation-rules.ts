/**
 * Foundation pure rules — 02-foundation-grammar.md §1/§6.
 *
 * No Nest, no database: the extractor and the service share these so a record
 * the service can serve is exactly a record the extractor accepted.
 */

/** Groups a learner can explicitly mark studied (D3). `pdfs` excluded by design. */
export const FOUNDATION_KINDS = [
  'pinyin',
  'tones',
  'sandhi',
  'radicals',
  'listening',
  'speaking',
] as const;

export type FoundationKind = (typeof FOUNDATION_KINDS)[number];

/** Which catalog group(s) back each markable kind. */
export const GROUPS_BY_KIND: Record<FoundationKind, readonly string[]> = {
  pinyin: ['initials', 'finals'],
  tones: ['tones'],
  sandhi: ['sandhi'],
  radicals: ['radicals'],
  listening: ['listening'],
  speaking: ['speaking'],
};

export function isFoundationKind(value: unknown): value is FoundationKind {
  return (
    typeof value === 'string' &&
    (FOUNDATION_KINDS as readonly string[]).includes(value)
  );
}

/**
 * The studied-state identity (D3): kind + source key. PG stores it as
 * contentKind='foundation' with this composite contentKey.
 */
export function foundationProgressKey(kind: FoundationKind, key: string): string {
  return `${kind}:${key}`;
}

/**
 * Tone geometry guard (02 §1: "validate numeric tone geometry before rendering").
 * The source `path` is coordinate pairs (`"8,12 92,12"`), NOT an SVG path —
 * the FE mock's `M4 10 H44` strings were invented and must never be stored.
 * Returns the points when every pair parses as finite numbers, else null.
 */
export function parseTonePath(path: unknown): Array<{ x: number; y: number }> | null {
  if (typeof path !== 'string' || path.trim() === '') return null;
  const points: Array<{ x: number; y: number }> = [];
  for (const pair of path.trim().split(/\s+/)) {
    const [xs, ys] = pair.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push({ x, y });
  }
  return points.length > 0 ? points : null;
}

export interface ValidFoundationRecord {
  group: string;
  key: string;
  data: Record<string, unknown>;
}

/**
 * Structural gate for one source row. Returns the storable record or the
 * reason it must be reported as invalid (never silently dropped).
 */
export function validateFoundationRecord(
  group: string,
  row: unknown,
): { ok: true; record: ValidFoundationRecord } | { ok: false; reason: string } {
  if (!row || typeof row !== 'object') return { ok: false, reason: 'not an object' };
  const r = row as Record<string, unknown>;
  if (group === 'radicals') {
    if (typeof r.no !== 'number' || !Number.isInteger(r.no) || r.no < 1) {
      return { ok: false, reason: 'radical without a valid `no`' };
    }
    if (typeof r.char !== 'string' || r.char === '') {
      return { ok: false, reason: `radical no=${String(r.no)} without a character` };
    }
    return { ok: true, record: { group, key: String(r.no), data: { ...r } } };
  }
  if (group === 'initials' || group === 'finals') {
    // Keyed by `sound`, not the ordinal source `id` (`ini-0`): the sound IS the
    // pedagogical identity — it is what the learner marks, what the FE renders,
    // and what survives a corpus reorder. Uniqueness across both groups is
    // enforced at extraction (a duplicate sound fails the import, D1).
    if (typeof r.sound !== 'string' || r.sound === '') {
      return { ok: false, reason: `record in ${group} without a sound` };
    }
    return { ok: true, record: { group, key: r.sound, data: { ...r } } };
  }
  if (group === 'tones') {
    if (typeof r.id !== 'number' || ![1, 2, 3, 4].includes(r.id)) {
      return { ok: false, reason: 'tone without id 1–4' };
    }
    if (parseTonePath(r.path) === null) {
      return { ok: false, reason: `tone id=${String(r.id)} has unparseable geometry` };
    }
    return { ok: true, record: { group, key: String(r.id), data: { ...r } } };
  }
  if (typeof r.id !== 'string' || r.id === '') {
    return { ok: false, reason: `record in ${group} without a string id` };
  }
  return { ok: true, record: { group, key: r.id, data: { ...r } } };
}
