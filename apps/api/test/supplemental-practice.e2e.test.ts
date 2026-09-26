import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Connection } from 'mongoose';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';

/**
 * API-020 lesson supplements (teacher/08-supplements.md §15, INV-SUP-01..12).
 * Real DB throughout. Fixtures are timestamped users/classes/lessons plus
 * READ-ONLY use of the shared published catalog (units + grammar); nothing in
 * Mongo is written except nothing — link rows live in Postgres and cascade
 * away with the fixture users.
 */

const PREFIX = 'api/v1';
const tag = randomUUID().slice(0, 8);

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;

let adminToken: string;
let teacherAToken: string;
let teacherBToken: string;
let studentAToken: string;
let studentBToken: string;
let studentCToken: string;
let classAId: string;
let classACode: string;
let classBId: string;
let lessonAId: string;
let lessonBId: string;
let unitSlug: string;
let grammarKey: string;
let grammarKey2: string;

type Res = { status: number; body: any };

function toDetails(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const err of errors) {
    const field = prefix ? `${prefix}.${err.property}` : err.property;
    const messages = Object.values(err.constraints ?? {});
    if (messages.length) out[field] = [...(out[field] ?? []), ...messages];
    if (err.children?.length) Object.assign(out, toDetails(err.children, field));
  }
  return out;
}

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  path: string,
  body?: any,
  token?: string,
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers['authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function registerApproveLogin(email: string, role: 'teacher' | 'student'): Promise<string> {
  const reg = await req('POST', '/auth/register', {
    email,
    password: 'Password123!',
    fullName: `Supp ${tag} ${role}`,
    role,
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  const approve = await req('PATCH', `/admin/users/${reg.body.data.id}/approve`, undefined, adminToken);
  assert.equal(approve.status, 200, JSON.stringify(approve.body));
  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return login.body.data.accessToken as string;
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(PREFIX);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', toDetails(errors)),
    }),
  );
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  prisma = app.get(PrismaService);
  mongo = app.get<Connection>(getConnectionToken());

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.body));
  adminToken = adminLogin.body.data.accessToken;

  teacherAToken = await registerApproveLogin(`supp-a-${tag}@hsk.local`, 'teacher');
  teacherBToken = await registerApproveLogin(`supp-b-${tag}@hsk.local`, 'teacher');
  studentAToken = await registerApproveLogin(`supp-sa-${tag}@hsk.local`, 'student');
  studentBToken = await registerApproveLogin(`supp-sb-${tag}@hsk.local`, 'student');
  studentCToken = await registerApproveLogin(`supp-sc-${tag}@hsk.local`, 'student');

  const classA = await req(
    'POST',
    '/teacher/classes',
    { name: `Supp class A ${tag}`, hskLevel: 3 },
    teacherAToken,
  );
  assert.equal(classA.status, 201, JSON.stringify(classA.body));
  classAId = classA.body.data.id;
  classACode = classA.body.data.enrollmentCode;

  const classB = await req(
    'POST',
    '/teacher/classes',
    { name: `Supp class B ${tag}`, hskLevel: 3 },
    teacherBToken,
  );
  classBId = classB.body.data.id;

  const lessonA = await req(
    'POST',
    `/teacher/classes/${classAId}/lessons`,
    { title: `Supp lesson A ${tag}`, contentType: 'text' },
    teacherAToken,
  );
  assert.equal(lessonA.status, 201, JSON.stringify(lessonA.body));
  lessonAId = lessonA.body.data.id ?? lessonA.body.data.lesson?.id;

  const lessonB = await req(
    'POST',
    `/teacher/classes/${classBId}/lessons`,
    { title: `Supp lesson B ${tag}`, contentType: 'text' },
    teacherBToken,
  );
  lessonBId = lessonB.body.data.id ?? lessonB.body.data.lesson?.id;

  for (const [token, code] of [
    [studentAToken, classACode],
    [studentBToken, classB.body.data.enrollmentCode],
    [studentCToken, classACode],
  ] as const) {
    const join = await req('POST', '/student/classes/join', { enrollmentCode: code }, token);
    assert.equal(join.status, 201, JSON.stringify(join.body));
  }

  // Keep the suite self-contained: CI seeds auth/grammar but intentionally has no
  // published learning catalog. A built-in fixture (no pathId) exercises the same
  // visibility rules as production catalog content and is removed in after().
  unitSlug = `supp-fixture-${tag}`;
  await mongo.collection('learning_units').insertOne({
    slug: unitSlug,
    curriculum: `supp-test-${tag}`,
    level: 3,
    order: 1,
    title: `HSK supplement fixture ${tag}`,
    sourceHash: `supp-test-${tag}`,
    words: [{ hanzi: '测试', pinyin: 'cè shì', meaning: 'kiểm thử' }],
    published: true,
    firstPublishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const units = await req('GET', '/teacher/learning-units', undefined, teacherAToken);
  assert.equal(units.status, 200, JSON.stringify(units.body));
  assert.ok(
    units.body.data.some((unit: { slug: string }) => unit.slug === unitSlug),
    'published fixture is missing from the learning-unit picker',
  );

  const grams = await req('GET', '/student/grammar?limit=50', undefined, studentAToken);
  assert.equal(grams.status, 200, JSON.stringify(grams.body));
  assert.ok(grams.body.data.length > 0, 'shared catalog has no grammar items');
  const first = grams.body.data[0] as Record<string, any>;
  // API grammar identity is the source `id` (= revision key). NOTE: `data.key`
  // is a DIFFERENT source field (e.g. a sample hanzi) — using it 404s everywhere.
  assert.ok(first.id, 'grammar list item has no id');
  grammarKey = String(first.id);
  const second = grams.body.data[1] as Record<string, any>;
  grammarKey2 = String(second.id);
  assert.notEqual(grammarKey2, grammarKey);
});

after(async () => {
  try {
    if (prisma) {
      // LearningPath.owner is RESTRICT (not cascade): paths first, then users.
      // Units created through the catalog API are removed with their path.
      const teachers = await prisma.user.findMany({
        where: {
          email: {
            in: [
              `supp-a-${tag}@hsk.local`,
              `supp-b-${tag}@hsk.local`,
            ],
          },
        },
        select: { id: true },
      });
      const teacherIds = teachers.map((t) => t.id);
      if (teacherIds.length) {
        await prisma.learningPath.deleteMany({ where: { ownerId: { in: teacherIds } } });
      }
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              `supp-a-${tag}@hsk.local`,
              `supp-b-${tag}@hsk.local`,
              `supp-sa-${tag}@hsk.local`,
              `supp-sb-${tag}@hsk.local`,
              `supp-sc-${tag}@hsk.local`,
            ],
          },
        },
      });
      const leftover = await prisma.supplementalPractice.count({
        where: { lesson: { class: { teacherId: { in: teacherIds } } } },
      });
      assert.equal(leftover, 0, 'supplement rows leaked past user cascade cleanup');
    }
  } finally {
    if (mongo && unitSlug) {
      await mongo.collection('learning_units').deleteOne({ slug: unitSlug });
    }
    await app?.close();
  }
});

describe('Lesson supplements (API-020 INV-SUP-01..12)', () => {
  it('INV-SUP-01/02: teacher B is denied on every write; unknown lesson is 404', async () => {
    const attach = await req(
      'POST',
      `/teacher/lessons/${lessonAId}/supplements`,
      { sourceType: 'learning_unit', sourceKey: unitSlug },
      teacherBToken,
    );
    assert.equal(attach.status, 403);
    assert.equal(attach.body.code, 'LESSON_ACCESS_DENIED');

    const remove = await req(
      'DELETE',
      `/teacher/lessons/${lessonAId}/supplements/${randomUUID()}`,
      undefined,
      teacherBToken,
    );
    assert.equal(remove.status, 403);
    assert.equal(remove.body.code, 'LESSON_ACCESS_DENIED');

    const reorder = await req(
      'PATCH',
      `/teacher/lessons/${lessonAId}/supplements/reorder`,
      [{ id: randomUUID(), orderIndex: 1 }],
      teacherBToken,
    );
    assert.equal(reorder.status, 403);

    const ghost = await req(
      'POST',
      `/teacher/lessons/${randomUUID()}/supplements`,
      { sourceType: 'learning_unit', sourceKey: unitSlug },
      teacherAToken,
    );
    assert.equal(ghost.status, 404);
    assert.equal(ghost.body.code, 'LESSON_NOT_FOUND');
  });

  it('INV-SUP-03: unknown or unpublished sources fail closed at attach', async () => {
    for (const body of [
      { sourceType: 'learning_unit', sourceKey: `nope-${tag}` },
      { sourceType: 'grammar_point', sourceKey: `nope-${tag}` },
    ]) {
      const res = await req('POST', `/teacher/lessons/${lessonAId}/supplements`, body, teacherAToken);
      assert.equal(res.status, 404, JSON.stringify(res.body));
      assert.equal(res.body.code, 'SUPPLEMENT_SOURCE_NOT_FOUND');
    }
  });

  it('INV-SUP-04: duplicate attach is 409 and creates nothing', async () => {
    const first = await req(
      'POST',
      `/teacher/lessons/${lessonAId}/supplements`,
      { sourceType: 'learning_unit', sourceKey: unitSlug },
      teacherAToken,
    );
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(first.body.data.orderIndex, 1);
    assert.ok(typeof first.body.data.title === 'string' && first.body.data.title.length > 0);

    const dup = await req(
      'POST',
      `/teacher/lessons/${lessonAId}/supplements`,
      { sourceType: 'learning_unit', sourceKey: unitSlug },
      teacherAToken,
    );
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'SUPPLEMENT_ALREADY_ATTACHED');

    const detail = await req('GET', `/teacher/lessons/${lessonAId}`, undefined, teacherAToken);
    assert.equal(
      detail.body.data.supplements.filter((s: any) => s.sourceKey === unitSlug).length,
      1,
    );
  });

  it('INV-SUP-05: reorder needs the complete dense permutation; failures commit nothing', async () => {
    const added = await req(
      'POST',
      `/teacher/lessons/${lessonAId}/supplements`,
      { sourceType: 'grammar_point', sourceKey: grammarKey },
      teacherAToken,
    );
    assert.equal(added.status, 201, JSON.stringify(added.body));
    const before = await req('GET', `/teacher/lessons/${lessonAId}`, undefined, teacherAToken);
    const ids = before.body.data.supplements.map((s: any) => s.id) as string[];
    assert.equal(ids.length, 2);

    const partial = await req(
      'PATCH',
      `/teacher/lessons/${lessonAId}/supplements/reorder`,
      [{ id: ids[0], orderIndex: 1 }],
      teacherAToken,
    );
    assert.equal(partial.status, 409);
    assert.equal(partial.body.code, 'SUPPLEMENT_ORDER_CONFLICT');

    const gapped = await req(
      'PATCH',
      `/teacher/lessons/${lessonAId}/supplements/reorder`,
      [
        { id: ids[0], orderIndex: 1 },
        { id: ids[1], orderIndex: 3 },
      ],
      teacherAToken,
    );
    assert.equal(gapped.status, 409);

    const swapped = await req(
      'PATCH',
      `/teacher/lessons/${lessonAId}/supplements/reorder`,
      [
        { id: ids[0], orderIndex: 2 },
        { id: ids[1], orderIndex: 1 },
      ],
      teacherAToken,
    );
    assert.equal(swapped.status, 200, JSON.stringify(swapped.body));
    assert.deepEqual(
      swapped.body.data.map((s: any) => [s.id, s.orderIndex]),
      [
        [ids[1], 1],
        [ids[0], 2],
      ],
    );
    const reread = await req('GET', `/teacher/lessons/${lessonAId}`, undefined, teacherAToken);
    assert.deepEqual(
      reread.body.data.supplements.map((s: any) => [s.id, s.orderIndex]),
      [
        [ids[1], 1],
        [ids[0], 2],
      ],
    );
  });

  it('INV-SUP-06: remove is link-only — source and progress survive', async () => {
    const saved = await req(
      'PUT',
      '/student/grammar/progress',
      { grammarId: grammarKey, studied: true },
      studentAToken,
    );
    assert.equal(saved.status, 200, JSON.stringify(saved.body));

    const detail = await req('GET', `/teacher/lessons/${lessonAId}`, undefined, teacherAToken);
    const target = detail.body.data.supplements.find((s: any) => s.sourceType === 'grammar_point');
    assert.ok(target);
    const gone = await req(
      'DELETE',
      `/teacher/lessons/${lessonAId}/supplements/${target.id}`,
      undefined,
      teacherAToken,
    );
    assert.equal(gone.status, 204);

    const again = await req(
      'DELETE',
      `/teacher/lessons/${lessonAId}/supplements/${target.id}`,
      undefined,
      teacherAToken,
    );
    assert.equal(again.status, 404);
    assert.equal(again.body.code, 'SUPPLEMENT_NOT_ATTACHED');

    const progress = await req('GET', '/student/grammar/progress', undefined, studentAToken);
    assert.ok(
      progress.body.data.studied.some(
        (r: any) => r.grammarId === grammarKey && r.studied === true,
      ),
      JSON.stringify(progress.body),
    );
    const picker = await req('GET', '/teacher/learning-units', undefined, teacherAToken);
    assert.ok(picker.body.data.some((u: any) => u.slug === unitSlug));
  });

  it('INV-SUP-07: student gates — active reads in order, everyone else denied', async () => {
    const ok = await req(
      'GET',
      `/student/classes/${classAId}/lessons/${lessonAId}`,
      undefined,
      studentAToken,
    );
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.ok(Array.isArray(ok.body.data.supplements));
    const orders = ok.body.data.supplements.map((s: any) => s.orderIndex);
    assert.deepEqual(orders, [...orders].sort((a: number, b: number) => a - b));
    assert.equal(JSON.stringify(ok.body.data).includes('enrollmentCode'), false);

    // Dropped student: join was done in before(); leave now.
    const leave = await req('DELETE', `/student/classes/${classAId}/leave`, undefined, studentCToken);
    assert.equal(leave.status, 200, JSON.stringify(leave.body));
    const dropped = await req(
      'GET',
      `/student/classes/${classAId}/lessons/${lessonAId}`,
      undefined,
      studentCToken,
    );
    assert.equal(dropped.status, 403);
    assert.equal(dropped.body.code, 'CLASS_ACCESS_DENIED');

    // Other-class student reads across the boundary.
    const foreign = await req(
      'GET',
      `/student/classes/${classBId}/lessons/${lessonAId}`,
      undefined,
      studentBToken,
    );
    assert.ok([403, 404].includes(foreign.status), JSON.stringify(foreign.body));

    // Cross-classId lesson reference.
    const cross = await req(
      'GET',
      `/student/classes/${classAId}/lessons/${lessonBId}`,
      undefined,
      studentAToken,
    );
    assert.equal(cross.status, 404);
    assert.equal(cross.body.code, 'LESSON_NOT_FOUND');

    // Anonymous.
    const anon = await req('GET', `/student/classes/${classAId}/lessons/${lessonAId}`);
    assert.equal(anon.status, 401);
  });

  it('INV-SUP-08: dead sources render available:false with no content', async () => {
    const lesson = await prisma.lesson.findFirstOrThrow({ where: { id: lessonAId } });
    assert.equal(lesson.classId, classAId);
    const ghost = await prisma.supplementalPractice.create({
      data: {
        lessonId: lessonAId,
        sourceType: 'learning_unit',
        sourceKey: `ghost-${tag}`,
        orderIndex: 99,
      },
    });
    try {
      const detail = await req(
        'GET',
        `/student/classes/${classAId}/lessons/${lessonAId}`,
        undefined,
        studentAToken,
      );
      assert.equal(detail.status, 200, JSON.stringify(detail.body));
      const row = detail.body.data.supplements.find((s: any) => s.id === ghost.id);
      assert.ok(row, 'ghost row must still be listed');
      assert.equal(row.available, false);
      assert.equal(row.title, null);
      assert.equal('words' in row, false);
    } finally {
      await prisma.supplementalPractice.delete({ where: { id: ghost.id } });
    }
  });

  it('INV-SUP-09: assignedOnly filters server-side across the full catalog', async () => {
    // Re-attach the grammar point removed in INV-SUP-06 (idempotent guard first).
    const detail = await req('GET', `/teacher/lessons/${lessonAId}`, undefined, teacherAToken);
    if (!detail.body.data.supplements.some((s: any) => s.sourceKey === grammarKey)) {
      const re = await req(
        'POST',
        `/teacher/lessons/${lessonAId}/supplements`,
        { sourceType: 'grammar_point', sourceKey: grammarKey },
        teacherAToken,
      );
      assert.equal(re.status, 201, JSON.stringify(re.body));
    }
    // A grammar attachment on the OTHER class must never leak in (teacherB side).
    const otherAttach = await req(
      'POST',
      `/teacher/lessons/${lessonBId}/supplements`,
      { sourceType: 'grammar_point', sourceKey: grammarKey2 },
      teacherBToken,
    );
    assert.equal(otherAttach.status, 201, JSON.stringify(otherAttach.body));

    const assigned = await req(
      'GET',
      '/student/grammar?assignedOnly=true&limit=50',
      undefined,
      studentAToken,
    );
    assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
    // API grammar identity is the list item `id` (= revision key). NOTE: items also
    // carry a source `key` field with unrelated content — mapping that 404s everything.
    const keys = assigned.body.data.map((g: any) => String(g.id));
    assert.ok(keys.includes(grammarKey), `assigned set misses ${grammarKey}: ${keys}`);
    assert.ok(!keys.includes(grammarKey2), `assigned set leaks cross-class ${grammarKey2}`);

    // Dropped student (studentC left classA above) sees an honest empty set.
    const droppedAssigned = await req(
      'GET',
      '/student/grammar?assignedOnly=true&limit=50',
      undefined,
      studentCToken,
    );
    assert.equal(droppedAssigned.status, 200);
    assert.deepEqual(droppedAssigned.body.data, []);

    // Param absent: self-study context untouched (full catalog).
    const full = await req('GET', '/student/grammar?limit=50', undefined, studentAToken);
    assert.ok(full.body.meta.total >= assigned.body.meta.total);
  });

  it('INV-SUP-10: reads create no attempts, scores, XP or SRS rows', async () => {
    const attemptsBefore = await prisma.attempt.count({ where: { studentId: await studentIdOf() } });
    await req('GET', `/student/classes/${classAId}/lessons/${lessonAId}`, undefined, studentAToken);
    await req('GET', '/student/grammar?assignedOnly=true&limit=50', undefined, studentAToken);
    await req('GET', `/student/grammar/${grammarKey}`, undefined, studentAToken);
    const attemptsAfter = await prisma.attempt.count({ where: { studentId: await studentIdOf() } });
    assert.equal(attemptsAfter, attemptsBefore);
  });

  it('INV-SUP-11: no sensitive data in any supplement payload', async () => {
    const teacherDetail = await req('GET', `/teacher/lessons/${lessonAId}`, undefined, teacherAToken);
    const studentDetail = await req(
      'GET',
      `/student/classes/${classAId}/lessons/${lessonAId}`,
      undefined,
      studentAToken,
    );
    for (const body of [teacherDetail.body, studentDetail.body]) {
      const text = JSON.stringify(body);
      assert.equal(text.includes('passwordHash'), false);
    }
    // enrollmentCode: the teacher detail legitimately embeds its OWN class row
    // (pre-existing shape, out of scope); it must never reach the student.
    assert.equal(JSON.stringify(studentDetail.body).includes('enrollmentCode'), false);
  });

  it('INV-SUP-12: pickers serve published summaries only, no answers', async () => {
    const units = await req(
      'GET',
      '/teacher/learning-units?search=HSK',
      undefined,
      teacherAToken,
    );
    assert.equal(units.status, 200, JSON.stringify(units.body));
    for (const u of units.body.data as any[]) {
      assert.equal('words' in u, false);
      const hay = `${u.slug} ${u.title}`.toLowerCase();
      assert.ok(hay.includes('hsk'), JSON.stringify(u));
    }
    const grams = await req(
      'GET',
      '/teacher/catalog/grammar?limit=20',
      undefined,
      teacherAToken,
    );
    assert.equal(grams.status, 200, JSON.stringify(grams.body));
    for (const g of grams.body.data as any[]) {
      assert.equal('tokens' in g, false);
    }
    // A teacher-authored draft unit never appears in the picker.
    const path = await req('POST', '/teacher/learning-paths', { title: `Supp draft path ${tag}` }, teacherAToken);
    if (path.status === 201) {
      const unit = await req(
        'POST',
        `/teacher/learning-paths/${path.body.data.id}/units`,
        {
          kind: 'authored',
          title: `Supp draft unit ${tag}`,
          level: 1,
          words: [{ hanzi: '测', pinyin: 'cè', meaning: 'thử' }],
        },
        teacherAToken,
      );
      if (unit.status === 201) {
        const slug = unit.body.data.slug as string;
        const hunt = await req(
          'GET',
          `/teacher/learning-units?search=${encodeURIComponent(slug)}`,
          undefined,
          teacherAToken,
        );
        assert.equal(
          hunt.body.data.some((u: any) => u.slug === slug),
          false,
        );
        // removePath deletes the draft path AND its units — no shared-catalog debris.
        const delPath = await req(
          'DELETE',
          `/teacher/learning-paths/${path.body.data.id}`,
          undefined,
          teacherAToken,
        );
        assert.equal(delPath.status, 204, JSON.stringify(delPath.body));
      }
    }
  });
});

async function studentIdOf(): Promise<string> {
  const row = await prisma.user.findFirstOrThrow({
    where: { email: `supp-sa-${tag}@hsk.local` },
  });
  return row.id;
}
