import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBadges, rankAggregates, studentAlias } from '../src/gamification/gamification.rules';

describe('gamification rules', () => {
  it('requires three attempts, normalizes scores and returns a caller outside top 20', () => {
    const rows = Array.from({ length: 22 }, (_, index) => ({ studentId: `s-${index}`, totalScore: 30 - index, maxScore: 30, gradedAttempts: 3 }));
    rows.push({ studentId: 'ineligible', totalScore: 20, maxScore: 20, gradedAttempts: 2 });
    const result = rankAggregates(rows, 's-21');
    assert.equal(result.rows.length, 20);
    assert.equal(result.me?.rank, 22);
    assert.equal(result.eligibleCount, 22);
    assert.equal(result.rows.some((row) => row.alias.includes('s-')), false);
  });

  it('uses a stable alias and deterministic attempt-count tie break', () => {
    assert.equal(studentAlias('same-id'), studentAlias('same-id'));
    const result = rankAggregates([
      { studentId: 'a', totalScore: 24, maxScore: 30, gradedAttempts: 3 },
      { studentId: 'b', totalScore: 32, maxScore: 40, gradedAttempts: 4 },
    ], 'a');
    assert.equal(result.rows[0].gradedAttempts, 4);
  });

  it('derives milestone and perfect timestamps from graded attempts', () => {
    const attempts = Array.from({ length: 5 }, (_, index) => ({
      gradedAt: new Date(`2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
      totalScore: index === 2 ? 10 : 8,
      maxScore: 10,
    }));
    const result = buildBadges(attempts);
    assert.equal(result.earnedCount, 3);
    assert.equal(result.badges.find((badge) => badge.id === 'five-grades')?.earnedAt, '2026-09-05T00:00:00.000Z');
    assert.equal(result.badges.find((badge) => badge.id === 'perfect-score')?.earnedAt, '2026-09-03T00:00:00.000Z');
    assert.equal(result.badges.find((badge) => badge.id === 'ten-grades')?.earnedAt, null);
  });
});
