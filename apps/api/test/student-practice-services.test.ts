import 'reflect-metadata';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WritingService } from '../dist/src/writing/writing.service';
import { LegoService } from '../dist/src/lego/lego.service';
import { WorkplaceService } from '../dist/src/workplace/workplace.service';
import type { PrismaService } from '../dist/src/prisma/prisma.service';

interface ProgressRow {
  userId: string;
  contentKind: string;
  contentKey: string;
  studied: boolean;
  updatedAt: Date;
}

interface UpsertArgs {
  where: {
    userId_contentKind_contentKey: {
      userId: string;
      contentKind: string;
      contentKey: string;
    };
  };
  create: Omit<ProgressRow, 'updatedAt'>;
  update: { studied: boolean };
}

class FakePrisma {
  rows: ProgressRow[] = [];

  userStudyProgress = {
    findMany: async ({ where }: { where: Partial<ProgressRow> }) =>
      this.rows.filter((row) => Object.entries(where).every(
        ([key, value]) => row[key as keyof ProgressRow] === value,
      )),
    upsert: async (args: UpsertArgs) => {
      const key = args.where.userId_contentKind_contentKey;
      let row = this.rows.find((item) =>
        item.userId === key.userId
        && item.contentKind === key.contentKind
        && item.contentKey === key.contentKey);
      if (!row) {
        row = { ...args.create, updatedAt: new Date('2026-09-18T00:00:00.000Z') };
        this.rows.push(row);
      } else {
        row.studied = args.update.studied;
      }
      return row;
    },
  };

  async $transaction<T>(operations: Promise<T>[]): Promise<T[]> {
    return Promise.all(operations);
  }
}

function services() {
  const fake = new FakePrisma();
  const prisma = fake as unknown as PrismaService;
  return {
    fake,
    writing: new WritingService(prisma),
    lego: new LegoService(prisma),
    workplace: new WorkplaceService(prisma),
  };
}

describe('WritingService', () => {
  it('serves the full validated corpus, optional strokes, and idempotent own progress', async () => {
    const { fake, writing } = services();
    assert.equal(writing.browse().length, 587);
    const first = writing.findOne('ch-1');
    assert.equal(first.char, '人');
    assert.equal(first.strokePaths?.length, 2);
    assert.equal('score' in first, false);

    assert.deepEqual(await writing.getProgress('student-a'), { practised: [] });
    await writing.markPractised('student-a', 'ch-1');
    await writing.markPractised('student-a', 'ch-1');
    assert.equal(fake.rows.length, 1, 'replay converges on one unique row');
    assert.equal((await writing.getProgress('student-a')).practised[0].characterId, 'ch-1');
    assert.equal((await writing.getProgress('student-b')).practised.length, 0);
    await assert.rejects(() => writing.markPractised('student-a', 'missing'));
  });
});

describe('LegoService', () => {
  it('shuffles reads, grades canonical order server-side and derives stars/unlocks', async () => {
    const { fake, lego } = services();
    const before = await lego.list('student-a');
    assert.equal(before.stations.length, 7);
    assert.equal(before.stations[0].progress.unlocked, true);
    assert.equal(before.stations[1].progress.unlocked, false);

    const station = lego.getStation('st-1');
    assert.equal(station.sentences.length, 5);
    assert.equal('pinyin' in station.sentences[0], false, 'answer reveal is withheld');

    const corpus = JSON.parse(readFileSync(join(process.cwd(), 'content', 'lego.json'), 'utf8')) as {
      sentences: Array<{ id: string; blocks: Array<{ id: string }> }>;
    };
    const canonical = Object.fromEntries(corpus.sentences
      .filter((item) => station.sentences.some((sentence) => sentence.id === item.id))
      .map((item) => [item.id, item.blocks.map((block) => block.id)]));
    const result = await lego.submit('student-a', 'st-1', {
      answers: Object.entries(canonical).map(([sentenceId, blockIds]) => ({ sentenceId, blockIds })),
    });
    assert.equal(result.progress.stars, 3);
    assert.ok(result.results.every((item) => item.correct));
    assert.equal(fake.rows.length, 6, 'one attempted marker + five correct sentences');

    const after = await lego.list('student-a');
    assert.equal(after.stations[1].progress.unlocked, true);
    await assert.rejects(() => lego.submit('student-a', 'st-1', {
      answers: [{ sentenceId: 'lg-1', blockIds: canonical['lg-1'] }],
    }));
  });
});

describe('WorkplaceService', () => {
  it('withholds models until ordered reveal and derives completion without storing replies', async () => {
    const { fake, workplace } = services();
    const detail = workplace.detail('sc-quotation');
    assert.equal(detail.turns.length, 3);
    assert.equal('model' in detail.turns[0], false);
    await assert.rejects(() => workplace.reveal('student-a', 'sc-quotation', 't2'));

    const first = await workplace.reveal('student-a', 'sc-quotation', 't1');
    assert.equal(typeof first.model, 'string');
    assert.equal(first.completed, false);
    await workplace.reveal('student-a', 'sc-quotation', 't2');
    const last = await workplace.reveal('student-a', 'sc-quotation', 't3');
    assert.equal(last.completed, true);
    assert.ok(fake.rows.every((row) => !('reply' in row)), 'reply text is never persisted');

    const list = await workplace.list('student-a');
    assert.equal(list.scenarios.find((item) => item.id === 'sc-quotation')?.progress.completed, true);
    assert.equal((await workplace.list('student-b')).scenarios[0].progress.completedTurns, 0);
    await assert.rejects(() => workplace.reveal('student-a', 'sc-quotation', 'missing'));
  });
});
