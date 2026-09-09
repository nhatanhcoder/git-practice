import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import mongoose, { type Connection } from 'mongoose';
import { FlashcardSchema } from '../dist/src/mongodb/schemas/flashcard.schema';
import { applyVocabulary, type ImportCard } from '../dist/src/flashcards/import/vocab-apply';

/**
 * TASK A11 — apply-path e2e, against a SANDBOX collection on the development
 * Mongo (Atlas via MONGODB_URI). Docker/Postgres is not needed: the importer
 * talks to Mongo only.
 *
 * Safety rules under test (checklist A11):
 *  - dry-run writes nothing;
 *  - rerun is idempotent: no duplicate rows, _id of referenced cards stable;
 *  - level changes update the existing card instead of creating a second one
 *    (upsert keyed by hanzi, per the audit §6 decision);
 *  - user_flashcard_states is never touched;
 *  - cleanup deletes only what this test created (no collection drop).
 */

dotenv.config({ path: join(process.cwd(), '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI;

const SANDBOX_COLLECTION = 'flashcards_a11_test';
const STATE_SANDBOX_COLLECTION = 'user_flashcard_states_a11_test';

const cards: ImportCard[] = [
  { hskLevel: 1, hanzi: '人们', pinyin: 'rénmen', meaning: 'mọi người', tags: ['hanlo'] },
  { hskLevel: 2, hanzi: '测试', pinyin: 'cèshì', meaning: 'kiểm tra', tags: ['hanlo'] },
];

describe('A11 · applyVocabulary (sandbox e2e)', { skip: !MONGODB_URI && 'MONGODB_URI missing' }, () => {
  let connection: Connection;
  let sandbox: mongoose.Model<any>;
  let stateSandbox: mongoose.Model<any>;

  before(async () => {
    connection = await mongoose.createConnection(MONGODB_URI!).asPromise();
    sandbox = connection.model('FlashcardA11Test', FlashcardSchema, SANDBOX_COLLECTION);
    stateSandbox = connection.model(
      'UserFlashcardStateA11Test',
      new mongoose.Schema({}, { strict: false, collection: STATE_SANDBOX_COLLECTION }),
    );
    await sandbox.deleteMany({});
    await stateSandbox.deleteMany({});
  });

  after(async () => {
    // Deletes only this test's documents in its own sandbox collections.
    // Rule 6: never drop a collection.
    await sandbox.deleteMany({});
    await stateSandbox.deleteMany({});
    await connection.close();
  });

  it('dry-run on an empty collection writes nothing', async () => {
    const report = await applyVocabulary(connection, cards, {
      dryRun: true,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    assert.equal(report.dryRun, true);
    assert.equal(report.wouldCreate, 2);
    assert.equal(report.wouldUpdate, 0);
    assert.equal(report.created, 0);
    assert.equal(report.updated, 0);
    assert.equal(await sandbox.countDocuments(), 0);
  });

  it('apply creates the cards exactly once', async () => {
    const report = await applyVocabulary(connection, cards, {
      dryRun: false,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    assert.equal(report.created, 2);
    assert.equal(report.updated, 0);
    assert.equal(report.errors.length, 0);
    assert.equal(await sandbox.countDocuments(), 2);
    const doc = await sandbox.findOne({ hanzi: '人们' });
    assert.ok(doc);
    assert.equal(doc!.hskLevel, 1);
    assert.equal(doc!.meaning, 'mọi người');
    assert.deepEqual(doc!.tags, ['hanlo']);
  });

  it('rerunning the same input updates in place — no duplicates, stable _id', async () => {
    const idBefore = (await sandbox.findOne({ hanzi: '人们' }))!._id.toString();
    const report = await applyVocabulary(connection, cards, {
      dryRun: false,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    assert.equal(report.created, 0);
    assert.equal(report.updated, 2);
    assert.equal(await sandbox.countDocuments(), 2);
    const idAfter = (await sandbox.findOne({ hanzi: '人们' }))!._id.toString();
    assert.equal(idAfter, idBefore);
  });

  it('a meaning/level change updates the same document, never a second row', async () => {
    const changed: ImportCard[] = [
      { hskLevel: 3, hanzi: '人们', pinyin: 'rénmen', meaning: 'mọi người (cập nhật)', tags: ['hanlo'] },
    ];
    const report = await applyVocabulary(connection, changed, {
      dryRun: false,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    assert.equal(report.updated, 1);
    assert.equal(report.created, 0);
    const count = await sandbox.countDocuments({ hanzi: '人们' });
    assert.equal(count, 1, 'a level change must not create a cross-level duplicate');
    const doc = await sandbox.findOne({ hanzi: '人们' });
    assert.equal(doc!.hskLevel, 3);
    assert.equal(doc!.meaning, 'mọi người (cập nhật)');
  });

  it('dry-run after apply reports updates only and changes nothing', async () => {
    const meaningBefore = (await sandbox.findOne({ hanzi: '测试' }))!.meaning;
    const report = await applyVocabulary(connection, cards, {
      dryRun: true,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    assert.equal(report.wouldUpdate, 2);
    assert.equal(report.wouldCreate, 0);
    assert.equal((await sandbox.findOne({ hanzi: '测试' }))!.meaning, meaningBefore);
  });

  it('apply never touches user review state', async () => {
    const cardDoc = await sandbox.findOne({ hanzi: '测试' });
    await stateSandbox.create({
      userId: 'a11-state-guard',
      flashcardId: cardDoc!._id,
      easeFactor: 2.5,
      intervalDays: 6,
      nextReviewDate: new Date('2030-01-01'),
    });
    await applyVocabulary(connection, cards, {
      dryRun: false,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    const state = await stateSandbox.findOne({ userId: 'a11-state-guard' });
    assert.ok(state, 'review state must survive the import untouched');
    assert.equal(state!.intervalDays, 6);
    assert.equal(state!.flashcardId.toString(), cardDoc!._id.toString());
  });

  it('a partial failure mid-batch recovers on rerun without duplicates', async () => {
    // Simulate: first run writes one card then dies; rerun must complete
    // without duplicating the already-written card.
    const partial: ImportCard[] = [
      { hskLevel: 1, hanzi: '恢复', pinyin: 'huīfù', meaning: 'phục hồi', tags: ['hanlo'] },
    ];
    await applyVocabulary(connection, partial, {
      dryRun: false,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    const full = [...cards, ...partial];
    const report = await applyVocabulary(connection, full, {
      dryRun: false,
      collection: SANDBOX_COLLECTION,
      modelName: 'FlashcardA11Test',
    });
    assert.equal(report.created, 0);
    assert.equal(report.updated, 3);
    assert.equal(await sandbox.countDocuments(), 3);
  });
});
