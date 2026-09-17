import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildChart, buildProgress, completedWeekStarts, utcMonday } from '../src/progress/progress.rules';

const NOW = new Date('2026-09-16T12:00:00.000Z');

describe('student progress rules', () => {
  it('anchors completed windows at Monday 00:00 UTC', () => {
    assert.equal(utcMonday(NOW).toISOString(), '2026-09-14T00:00:00.000Z');
    assert.equal(completedWeekStarts(NOW, 2)[0].toISOString(), '2026-08-31T00:00:00.000Z');
    assert.equal(completedWeekStarts(NOW, 2)[1].toISOString(), '2026-09-07T00:00:00.000Z');
  });

  it('keeps no-data cells null and excludes deleted questions from skill ratios', () => {
    const attempts = [{
      submittedAt: new Date('2026-09-08T10:00:00.000Z'), gradedAt: NOW, totalScore: 8,
      answers: [
        { questionId: 'reading', isCorrect: true },
        { questionId: 'deleted', isCorrect: false },
      ],
    }];
    const result = buildProgress(attempts, new Map([['reading', 'reading' as const]]), NOW);
    assert.equal(result.heatmap.at(-1)?.reading, 1);
    assert.equal(result.heatmap.at(-1)?.listening, null);
    assert.equal(result.totals.gradedAttempts, 1);
    assert.equal(result.totals.avgScore, 8);
  });

  it('returns twelve bounded chart points and ignores the current partial week', () => {
    const attempts = [{ submittedAt: NOW, gradedAt: NOW, totalScore: 10, answers: [] }];
    const chart = buildChart(attempts, NOW);
    assert.equal(chart.points.length, 12);
    assert.equal(chart.points.every((point) => point.avgScore === null && point.count === 0), true);
  });
});
