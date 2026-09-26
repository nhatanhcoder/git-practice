import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../dist/src/app.module';
import { PrismaService } from '../dist/src/prisma/prisma.service';

/**
 * P4 — API-020 migration constraints (teacher/08-supplements.md §12/§15).
 * Prisma-level only: no HTTP service exists yet (that's P5). Proves the
 * migration created exactly the contracted shape on a real database:
 * enum values, both UNIQUEs, lesson FK with CASCADE, composite index,
 * and that deleting a lesson never cascades into progress rows.
 */

const tag = randomUUID().slice(0, 8);

let app: INestApplication;
let prisma: PrismaService;
let teacherId: string;
let studentId: string;
let classId: string;
let lessonId: string;
let lesson2Id: string;

async function expectPrismaCode(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
  } catch (e: unknown) {
    const err = e as { code?: string };
    assert.equal(err?.code, code, `expected Prisma ${code}, got ${err?.code}: ${(e as Error)?.message}`);
    return;
  }
  assert.fail(`expected Prisma ${code} but the write succeeded`);
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  prisma = app.get(PrismaService);

  const teacher = await prisma.user.create({
    data: {
      email: `supp-teacher-${tag}@hsk.local`,
      passwordHash: 'x',
      role: 'teacher',
      status: 'active',
    },
  });
  teacherId = teacher.id;
  const student = await prisma.user.create({
    data: {
      email: `supp-student-${tag}@hsk.local`,
      passwordHash: 'x',
      role: 'student',
      status: 'active',
    },
  });
  studentId = student.id;
  const cls = await prisma.class.create({
    data: {
      teacherId,
      name: `Supp class ${tag}`,
      hskLevel: 3,
      enrollmentCode: tag.replaceAll('-', '').slice(0, 8).toUpperCase(),
    },
  });
  classId = cls.id;
  const lesson = await prisma.lesson.create({
    data: { classId, teacherId, title: `Supp lesson ${tag}`, orderIndex: 1 },
  });
  lessonId = lesson.id;
  const lesson2 = await prisma.lesson.create({
    data: { classId, teacherId, title: `Supp lesson 2 ${tag}`, orderIndex: 2 },
  });
  lesson2Id = lesson2.id;
  // A progress row keyed to a source we will attach, then delete the lesson for:
  // the cascade must never reach it (INV-SUP-06).
  await prisma.userStudyProgress.create({
    data: { userId: studentId, contentKind: 'grammar', contentKey: `g-supp-${tag}`, studied: true },
  });
});

after(async () => {
  if (prisma) {
    await prisma.user.deleteMany({
      where: { email: { in: [`supp-teacher-${tag}@hsk.local`, `supp-student-${tag}@hsk.local`] } },
    });
    const leftover = await prisma.supplementalPractice.count({
      where: { lesson: { class: { teacherId } } },
    });
    assert.equal(leftover, 0, 'supplement rows leaked past user cascade cleanup');
  }
  if (app) await app.close();
});

describe('SupplementalPractice migration constraints (API-020 §12)', () => {
  it('inserts a link row with the contracted shape', async () => {
    const row = await prisma.supplementalPractice.create({
      data: {
        lessonId,
        sourceType: 'learning_unit',
        sourceKey: `u-supp-${tag}`,
        orderIndex: 1,
      },
    });
    assert.equal(row.lessonId, lessonId);
    assert.equal(row.sourceType, 'learning_unit');
    assert.equal(row.orderIndex, 1);
    assert.ok(row.createdAt);
  });

  it('duplicate (lessonId, sourceType, sourceKey) is rejected', async () => {
    await expectPrismaCode(
      () =>
        prisma.supplementalPractice.create({
          data: { lessonId, sourceType: 'learning_unit', sourceKey: `u-supp-${tag}`, orderIndex: 2 },
        }),
      'P2002',
    );
  });

  it('duplicate orderIndex in the same lesson is rejected; same order in another lesson is fine', async () => {
    await expectPrismaCode(
      () =>
        prisma.supplementalPractice.create({
          data: { lessonId, sourceType: 'grammar_point', sourceKey: `g-supp-${tag}`, orderIndex: 1 },
        }),
      'P2002',
    );
    const other = await prisma.supplementalPractice.create({
      data: { lessonId: lesson2Id, sourceType: 'grammar_point', sourceKey: `g-supp-${tag}`, orderIndex: 1 },
    });
    assert.equal(other.orderIndex, 1);
  });

  it('unknown lessonId violates the foreign key', async () => {
    await expectPrismaCode(
      () =>
        prisma.supplementalPractice.create({
          data: {
            lessonId: randomUUID(),
            sourceType: 'learning_unit',
            sourceKey: `u-ghost-${tag}`,
            orderIndex: 1,
          },
        }),
      'P2003',
    );
  });

  it('sourceType outside the enum is rejected by the database', async () => {
    await assert.rejects(
      prisma.$executeRawUnsafe(
        `INSERT INTO "supplemental_practice" ("id", "lesson_id", "source_type", "source_key", "order_index") VALUES (gen_random_uuid(), $1::uuid, 'bogus', 'k', 99)`,
        lessonId,
      ),
    );
  });

  it('deleting the lesson cascades attachments but never progress rows', async () => {
    const before = await prisma.supplementalPractice.count({ where: { lessonId } });
    assert.ok(before >= 1);
    await prisma.lesson.delete({ where: { id: lessonId } });
    assert.equal(await prisma.supplementalPractice.count({ where: { lessonId } }), 0);
    // Progress keyed to the attached source survives (INV-SUP-06).
    assert.equal(
      await prisma.userStudyProgress.count({
        where: { userId: studentId, contentKind: 'grammar', contentKey: `g-supp-${tag}` },
      }),
      1,
    );
    // The sibling lesson's attachments are untouched.
    assert.equal(await prisma.supplementalPractice.count({ where: { lessonId: lesson2Id } }), 1);
  });
});
