/**
 * Foundation/Grammar extraction — pure, no database.
 * Mirrors the A11 vocab-extract shape: validate every source row against the
 * module rules, keep the valid records, report the invalid ones with reasons.
 * Invalid rows are never silently dropped — the CLI fails closed on them (D1:
 * the corpus is adopted as-audited; a row this gate rejects needs an editorial
 * decision, not a quiet skip).
 */
import {
  FOUNDATION_GROUPS,
} from '../../mongodb/schemas/foundation-item.schema';
import {
  validateFoundationRecord,
  type ValidFoundationRecord,
} from '../foundation-rules';
import {
  validateGrammarRecord,
  type ValidGrammarRecord,
} from '../../grammar/grammar-rules';

export interface InvalidRecord {
  scope: 'foundation' | 'grammar';
  group: string;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any;
  reason: string;
}

export interface FoundationExtraction {
  foundation: ValidFoundationRecord[];
  grammar: ValidGrammarRecord[];
  invalid: InvalidRecord[];
  stats: {
    foundationByGroup: Record<string, number>;
    grammarByLevel: Record<string, number>;
    grammarCategories: string[];
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractFoundation(foundationJson: any, grammarJson: any): FoundationExtraction {
  const foundation: ValidFoundationRecord[] = [];
  const grammar: ValidGrammarRecord[] = [];
  const invalid: InvalidRecord[] = [];

  if (!foundationJson || typeof foundationJson !== 'object' || Array.isArray(foundationJson)) {
    throw new Error('foundation.json must be an object of groups');
  }
  // Keys must be unique per group — and pinyin sounds across initials+finals,
  // because one `pinyin` studied-state namespace spans both groups. A repeat
  // is an editorial decision (D1), never a silent overwrite.
  const pinyinSounds = new Set<string>();
  for (const group of FOUNDATION_GROUPS) {
    const rows = foundationJson[group];
    if (!Array.isArray(rows)) {
      throw new Error(`foundation.json is missing group \`${group}\``);
    }
    const seenInGroup = new Set<string>();
    rows.forEach((row, index) => {
      const result = validateFoundationRecord(group, row);
      if (!result.ok) {
        invalid.push({ scope: 'foundation', group, index, row, reason: result.reason });
        return;
      }
      const pinyin = group === 'initials' || group === 'finals';
      if (seenInGroup.has(result.record.key) || (pinyin && pinyinSounds.has(result.record.key))) {
        invalid.push({
          scope: 'foundation',
          group,
          index,
          row,
          reason: `duplicate key \`${result.record.key}\``,
        });
        return;
      }
      seenInGroup.add(result.record.key);
      if (pinyin) pinyinSounds.add(result.record.key);
      foundation.push(result.record);
    });
  }

  if (!Array.isArray(grammarJson)) {
    throw new Error('grammar.json must be an array');
  }
  grammarJson.forEach((row, index) => {
    const result = validateGrammarRecord(row);
    if (result.ok) grammar.push(result.record);
    else invalid.push({ scope: 'grammar', group: 'grammar', index, row, reason: result.reason });
  });

  const foundationByGroup: Record<string, number> = {};
  for (const r of foundation) foundationByGroup[r.group] = (foundationByGroup[r.group] ?? 0) + 1;
  const grammarByLevel: Record<string, number> = {};
  const categories = new Set<string>();
  for (const r of grammar) {
    grammarByLevel[String(r.level)] = (grammarByLevel[String(r.level)] ?? 0) + 1;
    categories.add(r.category);
  }

  return {
    foundation,
    grammar,
    invalid,
    stats: {
      foundationByGroup,
      grammarByLevel,
      grammarCategories: [...categories].sort(),
    },
  };
}
