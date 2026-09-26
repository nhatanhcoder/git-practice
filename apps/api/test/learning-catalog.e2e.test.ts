import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import type { Connection } from 'mongoose';
import { AppModule } from '../dist/src/app.module.js';
import { AppException } from '../dist/src/common/errors/app.exception.js';
import { ErrorCode } from '../dist/src/common/errors/error-codes.js';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter.js';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor.js';
import { PrismaService } from '../dist/src/prisma/prisma.service.js';

const fixture = randomUUID().slice(0, 8);
const mongoName = `hsk_catalog_test_${fixture}`;
const password = 'Password123!';
const userIds: string[] = [];
let app: INestApplication;
let prisma: PrismaService;
let mongo: Connection;
let base: string;
let originalMongo: string | undefined;
let teacherA: Actor;
let teacherB: Actor;
let adminA: Actor;
let adminB: Actor;
let student: Actor;
let pathA: any;
let pathB: any;
let unitA: any;
let unitB: any;
let referenceUnit: any;

type Actor = { id: string; token: string };

function details(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const error of errors) {
    const key = prefix ? `${prefix}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    if (messages.length) result[key] = messages;
    if (error.children?.length) Object.assign(result, details(error.children, key));
  }
  return result;
}

async function request(method: string, path: string, token?: string, body?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json();
  return { status: response.status, data: json.data, body: json };
}

async function createActor(role: 'teacher' | 'admin' | 'student', tag: string): Promise<Actor> {
  const row = await prisma.user.create({
    data: {
      email: `catalog.${fixture}.${tag}@hsk.local`,
      passwordHash: await bcrypt.hash(password, 4),
      role,
      status: 'active',
      nickname: `${role}-${tag}`,
    },
  });
  userIds.push(row.id);
  const login = await request('POST', '/auth/login', undefined, {
    email: row.email,
    password,
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id: row.id, token: login.data.accessToken };
}

function authored(title: string) {
  return {
    kind: 'authored',
    title,
    level: 1,
    words: [
      { hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'xin chào' },
      { hanzi: '谢谢', pinyin: 'xiè xie', meaning: 'cảm ơn' },
    ],
  };
}

before(async () => {
  originalMongo = process.env.MONGODB_URI;
  assert.ok(originalMongo, 'MONGODB_URI is required');
  const authorityEnd = originalMongo.indexOf('/', originalMongo.indexOf('://') + 3);
  const queryStart = originalMongo.indexOf('?');
  const end = authorityEnd < 0 ? (queryStart < 0 ? originalMongo.length : queryStart) : authorityEnd;
  process.env.MONGODB_URI =
    originalMongo.slice(0, end) + '/' + mongoName + (queryStart < 0 ? '' : originalMongo.slice(queryStart));

  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', details(errors)),
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost') + '/api/v1';
  prisma = app.get(PrismaService);
  mongo = app.get<Connection>(getConnectionToken());
  [teacherA, teacherB, adminA, adminB, student] = await Promise.all([
    createActor('teacher', 'teacher-a'),
    createActor('teacher', 'teacher-b'),
    createActor('admin', 'admin-a'),
    createActor('admin', 'admin-b'),
    createActor('student', 'student'),
  ]);
});

after(async () => {
  if (prisma) {
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.learningPath.deleteMany({
      where: { ownerId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (mongo?.name === mongoName && mongoName.startsWith('hsk_catalog_test_')) await mongo.dropDatabase();
  if (app) await app.close();
  if (originalMongo) process.env.MONGODB_URI = originalMongo;
});

describe('Teacher-authored Learning Catalog invariants', () => {
  it('INV-LMOD-01 and RBAC branches: role-prefixed endpoints fail closed', async () => {
    assert.equal((await request('GET', '/teacher/learning-paths')).status, 401);
    assert.equal((await request('GET', '/teacher/learning-paths', adminA.token)).status, 403);
    assert.equal((await request('GET', '/teacher/learning-paths', student.token)).status, 403);
    assert.equal((await request('GET', '/admin/learning-paths', teacherA.token)).status, 403);
    assert.equal((await request('GET', '/admin/learning-paths', student.token)).status, 403);
    assert.equal(
      (
        await request('POST', '/teacher/learning-paths', adminA.token, {
          title: 'No author',
        })
      ).status,
      403,
    );
  });

  it('INV-LCAT-01/02/12: ownership is enforced and private fields stay off wire', async () => {
    const a = await request('POST', '/teacher/learning-paths', teacherA.token, {
      title: 'Lộ trình giao tiếp',
      description: 'Nội dung thử nghiệm',
      ownerId: teacherB.id,
    });
    assert.equal(a.status, 400);
    const createdA = await request('POST', '/teacher/learning-paths', teacherA.token, {
      title: 'Lộ trình giao tiếp',
      description: 'Nội dung thử nghiệm',
    });
    assert.equal(createdA.status, 201, JSON.stringify(createdA.body));
    pathA = createdA.data;
    const createdB = await request('POST', '/teacher/learning-paths', teacherB.token, {
      title: 'Lộ trình công sở',
    });
    pathB = createdB.data;
    assert.equal((await request('GET', `/teacher/learning-paths/${pathA.id}`, teacherB.token)).status, 403);
    assert.equal(
      (await request('PATCH', `/teacher/learning-paths/${pathA.id}`, teacherB.token, { title: 'Đổi sai chủ' })).status,
      403,
    );
    const own = await request('GET', `/teacher/learning-paths/${pathA.id}`, teacherA.token);
    assert.equal(own.status, 200);
    assert.equal('ownerId' in own.data, false);
    assert.equal(JSON.stringify(own.data).includes('sourceHash'), false);
  });

  it('serializes a Teacher mutation behind the path state lock and rechecks the frozen state', async () => {
    const created = await request('POST', '/teacher/learning-paths', teacherA.token, {
      title: 'Path kiểm tra khóa trạng thái',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    let mutation!: Promise<Awaited<ReturnType<typeof request>>>;
    let settled = false;
    await prisma.$transaction(async (tx) => {
      const lockKey = `learning-catalog:${created.data.id}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS lock_result`;
      mutation = request('PATCH', `/teacher/learning-paths/${created.data.id}`, teacherA.token, {
        title: 'Không được lọt qua trạng thái frozen',
      });
      void mutation.finally(() => {
        settled = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(settled, false, 'Teacher mutation must wait for the path advisory lock');
      await tx.learningPath.update({
        where: { id: created.data.id },
        data: { status: 'pending_review', submittedAt: new Date() },
      });
    });

    const blocked = await mutation;
    assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
    assert.equal(blocked.body.code, 'LEARNING_PATH_FROZEN');
    const stored = await prisma.learningPath.findUniqueOrThrow({
      where: { id: created.data.id },
    });
    assert.equal(stored.title, 'Path kiểm tra khóa trạng thái');
  });

  it('serializes concurrent creates so the 100-unit cap and path-wide order remain exact', async () => {
    const created = await request('POST', '/teacher/learning-paths', teacherA.token, {
      title: 'Path kiểm tra giới hạn đồng thời',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const pathId = created.data.id;
    const curriculum = created.data.curriculumKey;
    await mongo.collection('learning_units').insertMany(
      Array.from({ length: 99 }, (_, index) => ({
        slug: `${curriculum}-seed-${index + 1}`,
        curriculum,
        pathId,
        authorId: teacherA.id,
        kind: 'authored',
        level: 1,
        order: index + 1,
        title: `Bài seed ${index + 1}`,
        sourceHash: `${fixture}-${index}`.padEnd(64, '0').slice(0, 64),
        words: authored('seed').words,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );

    const race = await Promise.all([
      request('POST', `/teacher/learning-paths/${pathId}/units`, teacherA.token, authored('Bài thứ một trăm A')),
      request('POST', `/teacher/learning-paths/${pathId}/units`, teacherA.token, authored('Bài thứ một trăm B')),
    ]);
    assert.deepEqual(race.map((response) => response.status).sort(), [201, 400]);
    assert.equal(race.find((response) => response.status === 400)?.body.code, 'VALIDATION_ERROR');
    const rows = await mongo.collection('learning_units').find({ pathId }).sort({ order: 1 }).toArray();
    assert.equal(rows.length, 100);
    assert.deepEqual(
      rows.map((row) => row.order),
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
  });

  it('INV-LCAT-04/03/05 and notification producer: submit is guarded, atomic and freezes teacher writes', async () => {
    const empty = await request('POST', `/teacher/learning-paths/${pathA.id}/submit`, teacherA.token, {});
    assert.equal(empty.status, 409);
    assert.equal(empty.body.code, 'LEARNING_PATH_EMPTY');
    const created = await request(
      'POST',
      `/teacher/learning-paths/${pathA.id}/units`,
      teacherA.token,
      authored('Chào hỏi'),
    );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    unitA = created.data;
    const submitted = await request('POST', `/teacher/learning-paths/${pathA.id}/submit`, teacherA.token, {});
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.status, 'pending_review');
    assert.equal(
      (await request('PATCH', `/teacher/learning-paths/${pathA.id}`, teacherA.token, { title: 'Đang review' })).body
        .code,
      'LEARNING_PATH_FROZEN',
    );
    assert.equal(
      (await request('POST', `/teacher/learning-paths/${pathA.id}/units`, teacherA.token, authored('Không được tạo')))
        .body.code,
      'LEARNING_PATH_FROZEN',
    );
    assert.equal(
      await prisma.notification.count({
        where: {
          type: 'learning_path_submitted',
          referenceId: pathA.id,
          userId: { in: [adminA.id, adminB.id] },
        },
      }),
      2,
    );
  });

  it('INV-LMOD-02/05/08: concurrent approve has one winner, one notification and complete audit', async () => {
    const race = await Promise.all([
      request('PATCH', `/admin/learning-paths/${pathA.id}/approve`, adminA.token, {}),
      request('PATCH', `/admin/learning-paths/${pathA.id}/approve`, adminB.token, {}),
    ]);
    assert.deepEqual(race.map((response) => response.status).sort(), [200, 409]);
    assert.equal(
      await prisma.notification.count({
        where: {
          type: 'learning_path_approved',
          referenceId: pathA.id,
          userId: teacherA.id,
        },
      }),
      1,
    );
    const stored = await prisma.learningPath.findUniqueOrThrow({
      where: { id: pathA.id },
    });
    assert.equal(stored.status, 'approved');
    assert.ok(stored.reviewedById);
    assert.ok(stored.reviewedAt);
  });

  it('INV-LCAT-06/07/08/14: publish is approved-only, immutable after first publish and unpublish preserves progress', async () => {
    const published = await request('POST', `/teacher/learning-units/${unitA.id}/publish`, teacherA.token, {});
    assert.equal(published.status, 200, JSON.stringify(published.body));
    const stored = await mongo.collection('learning_units').findOne({ slug: unitA.slug });
    assert.ok(stored?.firstPublishedAt);
    const originalWords = stored?.words;
    assert.equal(
      (await request('PATCH', `/teacher/learning-units/${unitA.id}`, teacherA.token, { title: 'Không được sửa' })).body
        .code,
      'LEARNING_UNIT_PUBLISHED_IMMUTABLE',
    );
    assert.equal((await request('DELETE', `/teacher/learning-units/${unitA.id}`, teacherA.token)).status, 409);
    await mongo.collection('user_learning_progress').insertOne({
      userId: student.id,
      unitSlug: unitA.slug,
      status: 'completed',
      studyIndex: 2,
      revision: 1,
      answers: ['a', 'b'],
      bestScore: 2,
      lastScore: 2,
      startedAt: new Date(),
      completedAt: new Date(),
    });
    assert.equal(
      (await request('POST', `/teacher/learning-units/${unitA.id}/unpublish`, teacherA.token, {})).status,
      200,
    );
    assert.equal(
      await mongo.collection('user_learning_progress').countDocuments({ userId: student.id, unitSlug: unitA.slug }),
      1,
    );
    assert.deepEqual((await mongo.collection('learning_units').findOne({ slug: unitA.slug }))?.words, originalWords);
    assert.equal(
      (await request('POST', `/teacher/learning-units/${unitA.id}/publish`, teacherA.token, {})).status,
      200,
    );
    assert.deepEqual((await mongo.collection('learning_units').findOne({ slug: unitA.slug }))?.words, originalWords);
  });

  it('INV-LCAT-09: reorder accepts only the complete 1..N permutation', async () => {
    const second = await request(
      'POST',
      `/teacher/learning-paths/${pathA.id}/units`,
      teacherA.token,
      authored('Bài thứ hai'),
    );
    assert.equal(second.status, 201);
    const invalid = await request('PATCH', `/teacher/learning-paths/${pathA.id}/units/reorder`, teacherA.token, [
      { id: second.data.id, order: 1 },
    ]);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, 'LEARNING_UNIT_ORDER_INVALID');
    const valid = await request('PATCH', `/teacher/learning-paths/${pathA.id}/units/reorder`, teacherA.token, [
      { id: unitA.id, order: 2 },
      { id: second.data.id, order: 1 },
    ]);
    assert.equal(valid.status, 200, JSON.stringify(valid.body));
    assert.deepEqual(
      valid.data.units.map((unit: any) => unit.order),
      [1, 2],
    );
  });

  it('INV-LCAT-10: reference keeps no copied words and rejects a suspended source path', async () => {
    await mongo.collection('learning_units').insertOne({
      slug: `builtin-${fixture}`,
      curriculum: 'hanlo_vocabulary',
      level: 1,
      order: 900,
      title: 'Nguồn nền tảng',
      sourceHash: fixture.padEnd(64, '0'),
      words: authored('x').words,
      published: true,
      firstPublishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const reference = await request('POST', `/teacher/learning-paths/${pathA.id}/units`, teacherA.token, {
      kind: 'reference',
      title: 'Bài tham chiếu',
      level: 1,
      referenceSlug: `builtin-${fixture}`,
    });
    assert.equal(reference.status, 201, JSON.stringify(reference.body));
    referenceUnit = reference.data;
    assert.deepEqual((await mongo.collection('learning_units').findOne({ slug: referenceUnit.slug }))?.words, []);

    unitB = (
      await request('POST', `/teacher/learning-paths/${pathB.id}/units`, teacherB.token, authored('Nguồn công sở'))
    ).data;
    await request('POST', `/teacher/learning-paths/${pathB.id}/submit`, teacherB.token, {});
    await request('PATCH', `/admin/learning-paths/${pathB.id}/approve`, adminA.token, {});
    await request('POST', `/teacher/learning-units/${unitB.id}/publish`, teacherB.token, {});
    await request('PATCH', `/admin/learning-paths/${pathB.id}/suspend`, adminA.token, {});
    const blocked = await request('POST', `/teacher/learning-paths/${pathA.id}/units`, teacherA.token, {
      kind: 'reference',
      title: 'Nguồn đã suspend',
      level: 1,
      referenceSlug: unitB.slug,
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, 'LEARNING_UNIT_REFERENCE_INVALID');
  });

  it('INV-LMOD-03/12: reject reason is exact, visible to owner and only owner can resubmit', async () => {
    const created = await request('POST', '/teacher/learning-paths', teacherA.token, { title: 'Path bị từ chối' });
    const unit = await request(
      'POST',
      `/teacher/learning-paths/${created.data.id}/units`,
      teacherA.token,
      authored('Bài chờ từ chối'),
    );
    await request('POST', `/teacher/learning-paths/${created.data.id}/submit`, teacherA.token, {});
    const invalid = await request('PATCH', `/admin/learning-paths/${created.data.id}/reject`, adminA.token, {
      rejectionReason: '   ',
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, 'LEARNING_PATH_REJECTION_REASON_REQUIRED');
    const rejected = await request('PATCH', `/admin/learning-paths/${created.data.id}/reject`, adminA.token, {
      rejectionReason: 'Nội dung cần rõ hơn',
    });
    assert.equal(rejected.status, 200);
    const owner = await request('GET', `/teacher/learning-paths/${created.data.id}`, teacherA.token);
    assert.equal(owner.data.rejectionReason, 'Nội dung cần rõ hơn');
    assert.equal((await request('GET', `/teacher/learning-paths/${created.data.id}`, teacherB.token)).status, 403);
    assert.equal(
      (await request('POST', `/teacher/learning-paths/${created.data.id}/submit`, teacherA.token, {})).status,
      200,
    );
    assert.equal(
      (await request('PATCH', `/admin/learning-paths/${created.data.id}/approve`, adminA.token, {})).status,
      200,
    );
    assert.ok(unit.data.id);
  });

  it('INV-LCAT-11: delete is blocked by approval, publication history or learner progress', async () => {
    assert.equal((await request('DELETE', `/teacher/learning-paths/${pathA.id}`, teacherA.token)).status, 409);
    const progressPath = (
      await request('POST', '/teacher/learning-paths', teacherA.token, {
        title: 'Draft có progress',
      })
    ).data;
    const progressUnit = (
      await request('POST', `/teacher/learning-paths/${progressPath.id}/units`, teacherA.token, authored('Draft unit'))
    ).data;
    await mongo.collection('user_learning_progress').insertOne({
      userId: student.id,
      unitSlug: progressUnit.slug,
      status: 'in_progress',
    });
    const blocked = await request('DELETE', `/teacher/learning-paths/${progressPath.id}`, teacherA.token);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, 'LEARNING_PATH_HAS_PUBLISHED_UNITS');
    const clean = (
      await request('POST', '/teacher/learning-paths', teacherA.token, {
        title: 'Draft xoá được',
      })
    ).data;
    assert.equal((await request('DELETE', `/teacher/learning-paths/${clean.id}`, teacherA.token)).status, 200);
  });

  it('INV-LMOD-04/10/11 and student visibility: suspend hides, restore preserves published set and progress', async () => {
    const before = await request(
      'GET',
      `/student/learning-path?curriculum=${pathA.curriculumKey}&level=1`,
      student.token,
    );
    const publishedBefore = before.data.units
      .filter((unit: any) => unit.state !== 'unavailable')
      .map((unit: any) => unit.slug);
    assert.ok(publishedBefore.includes(unitA.slug));
    const suspended = await request('PATCH', `/admin/learning-paths/${pathA.id}/suspend`, adminA.token, {});
    assert.equal(suspended.status, 200);
    assert.equal((await request('PATCH', `/admin/learning-paths/${pathA.id}/suspend`, adminB.token, {})).status, 409);
    assert.equal(
      (await request('GET', `/student/learning-path?curriculum=${pathA.curriculumKey}&level=1`, student.token)).data
        .total,
      0,
    );
    assert.equal(
      (await request('GET', '/student/learning-path/curricula', student.token)).data.some(
        (row: any) => row.key === pathA.curriculumKey,
      ),
      false,
    );
    assert.equal(
      await mongo.collection('user_learning_progress').countDocuments({ userId: student.id, unitSlug: unitA.slug }),
      1,
    );
    const restored = await request('PATCH', `/admin/learning-paths/${pathA.id}/restore`, adminB.token, {});
    assert.equal(restored.status, 200);
    const afterCatalog = await request(
      'GET',
      `/student/learning-path?curriculum=${pathA.curriculumKey}&level=1`,
      student.token,
    );
    const publishedAfter = afterCatalog.data.units
      .filter((unit: any) => unit.state !== 'unavailable')
      .map((unit: any) => unit.slug);
    assert.deepEqual(publishedAfter, publishedBefore);
    const audit = await prisma.learningPath.findUniqueOrThrow({
      where: { id: pathA.id },
    });
    assert.equal(audit.restoredById, adminB.id);
    assert.ok(audit.restoredAt);
  });

  it('INV-LMOD-06/07/09 and INV-LCAT-13: admin unpublishes without editing/deleting content or progress', async () => {
    const before = await mongo.collection('learning_units').findOne({ slug: unitA.slug });
    const response = await request('PATCH', `/admin/learning-units/${unitA.id}/unpublish`, adminA.token, {});
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.data.moderation.moderatedById, adminA.id);
    const afterUnit = await mongo.collection('learning_units').findOne({ slug: unitA.slug });
    assert.deepEqual(afterUnit?.words, before?.words);
    assert.equal(afterUnit?.title, before?.title);
    assert.equal(
      await mongo.collection('user_learning_progress').countDocuments({ userId: student.id, unitSlug: unitA.slug }),
      1,
    );
    assert.equal((await request('GET', `/student/learning-path/${unitA.slug}`, student.token)).status, 404);
    assert.equal(await mongo.collection('flashcards').countDocuments({}), 0);
    assert.equal(await mongo.collection('user_flashcard_states').countDocuments({}), 0);
    assert.equal(await prisma.attempt.count({ where: { studentId: student.id } }), 0);
  });

  it('INV-LCAT-10 addendum: a missing reference source remains an unavailable catalog node', async () => {
    await request('POST', `/teacher/learning-units/${referenceUnit.id}/publish`, teacherA.token, {});
    await mongo.collection('learning_units').updateOne({ slug: `builtin-${fixture}` }, { $set: { published: false } });
    const catalog = await request(
      'GET',
      `/student/learning-path?curriculum=${pathA.curriculumKey}&level=1`,
      student.token,
    );
    const node = catalog.data.units.find((unit: any) => unit.slug === referenceUnit.slug);
    assert.ok(node);
    assert.equal(node.state, 'unavailable');
    assert.equal((await request('GET', `/student/learning-path/${referenceUnit.slug}`, student.token)).status, 404);
  });
});
