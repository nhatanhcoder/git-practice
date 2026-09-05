import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;

// This suite builds and tears down every account it uses. It deliberately does not reuse the
// seeded students: API-012 records two existing tests that depend on a seed row keeping its
// status, and they break the moment anyone exercises the approve flow by hand.
const TEACHER_EMAIL = 'test.senroll.teacher@hsk.local';
const STUDENT_A_EMAIL = 'test.senroll.student.a@hsk.local';
const STUDENT_B_EMAIL = 'test.senroll.student.b@hsk.local';
const OWNED_EMAILS = [TEACHER_EMAIL, STUDENT_A_EMAIL, STUDENT_B_EMAIL];

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

type Res = { status: number; headers: Headers; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
  token?: string,
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
}

let adminToken: string;
let teacherToken: string;
let studentAToken: string;
let studentBToken: string;
let studentAId: string;

async function registerApproveLogin(
  email: string,
  fullName: string,
  role: 'teacher' | 'student',
): Promise<{ id: string; token: string }> {
  const reg = await req('POST', '/auth/register', {
    email,
    password: 'Password123!',
    fullName,
    role,
  });
  assert.equal(reg.status, 201, `register ${email} failed: ${JSON.stringify(reg.body)}`);

  const approve = await req('PATCH', `/admin/users/${reg.body.data.id}/approve`, undefined, adminToken);
  assert.equal(approve.status, 200, `approve ${email} failed: ${JSON.stringify(approve.body)}`);

  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  assert.equal(login.status, 200, `login ${email} failed: ${JSON.stringify(login.body)}`);

  return { id: reg.body.data.id, token: login.body.data.accessToken };
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

  // Leftovers from an interrupted previous run would make register return 409.
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  teacherToken = (await registerApproveLogin(TEACHER_EMAIL, 'Giáo Viên Ghi Danh', 'teacher')).token;

  const a = await registerApproveLogin(STUDENT_A_EMAIL, 'Học Sinh A', 'student');
  studentAId = a.id;
  studentAToken = a.token;

  studentBToken = (await registerApproveLogin(STUDENT_B_EMAIL, 'Học Sinh B', 'student')).token;
});

after(async () => {
  // Scoped to the three accounts this suite created. Classes and enrollments cascade off them.
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

describe('Student enrollment — F2.3 join', () => {
  let classId: string;
  let code: string;

  it('sets up a class owned by the test teacher', async () => {
    const res = await req(
      'POST',
      '/teacher/classes',
      { name: 'HSK 4 Ghi Danh', hskLevel: 4, description: 'Lớp cho test ghi danh' },
      teacherToken,
    );
    assert.equal(res.status, 201);
    classId = res.body.data.id;
    code = res.body.data.enrollmentCode;
  });

  it('rejects a code that names no class with CLASS_ENROLL_CODE_INVALID (404)', async () => {
    const res = await req('POST', '/student/classes/join', { enrollmentCode: 'ZZZZ9999' }, studentAToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'CLASS_ENROLL_CODE_INVALID');
  });

  it('rejects a malformed code as VALIDATION_ERROR, not as an unknown class', async () => {
    // The two are different failures: "not a code at all" vs "a code naming no class".
    const res = await req('POST', '/student/classes/join', { enrollmentCode: 'abc' }, studentAToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('normalises a lower-case code typed by the student', async () => {
    const res = await req(
      'POST',
      '/student/classes/join',
      { enrollmentCode: code.toLowerCase() },
      studentAToken,
    );
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.classId, classId);
    assert.equal(res.body.data.enrollmentStatus, 'active');
    assert.equal(res.body.data.rejoinedAt, null);
  });

  it('refuses a second join by the same student — CLASS_ALREADY_ENROLLED (409), INV-CLASS-05', async () => {
    const res = await req('POST', '/student/classes/join', { enrollmentCode: code }, studentAToken);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'CLASS_ALREADY_ENROLLED');
  });

  it('refuses a teacher calling a student endpoint (role guard)', async () => {
    const res = await req('POST', '/student/classes/join', { enrollmentCode: code }, teacherToken);
    assert.equal(res.status, 403);
  });

  it('makes the student visible in the teacher roster — the cross-actor link, F2.5', async () => {
    const res = await req('GET', `/teacher/classes/${classId}`, undefined, teacherToken);
    assert.equal(res.status, 200);
    const ids = res.body.data.students.map((s: any) => s.id);
    assert.ok(ids.includes(studentAId), 'enrolled student missing from teacher roster');
  });

  it('creates exactly one row under two concurrent joins — INV-CLASS-05, real DB', async () => {
    const cls = await req(
      'POST',
      '/teacher/classes',
      { name: 'HSK 5 Đồng Thời', hskLevel: 5 },
      teacherToken,
    );
    const raceCode = cls.body.data.enrollmentCode;

    const [r1, r2] = await Promise.all([
      req('POST', '/student/classes/join', { enrollmentCode: raceCode }, studentBToken),
      req('POST', '/student/classes/join', { enrollmentCode: raceCode }, studentBToken),
    ]);

    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409], `expected one 201 and one 409, got ${statuses}`);

    const rows = await prisma.classEnrollment.findMany({
      where: { classId: cls.body.data.id },
    });
    assert.equal(rows.length, 1, 'the unique constraint did not hold under concurrency');
  });

  it('refuses joining an archived class — CLASS_ALREADY_ARCHIVED, INV-CLASS-02', async () => {
    const cls = await req(
      'POST',
      '/teacher/classes',
      { name: 'HSK 2 Lưu Trữ', hskLevel: 2 },
      teacherToken,
    );
    const archivedCode = cls.body.data.enrollmentCode;
    await req('PATCH', `/teacher/classes/${cls.body.data.id}/archive`, undefined, teacherToken);

    const res = await req(
      'POST',
      '/student/classes/join',
      { enrollmentCode: archivedCode },
      studentBToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'CLASS_ALREADY_ARCHIVED');
  });
});

describe('Student enrollment — F2.4 leave, F2.6 list, and re-join', () => {
  let classId: string;
  let code: string;

  before(async () => {
    const res = await req(
      'POST',
      '/teacher/classes',
      { name: 'HSK 6 Rời Lớp', hskLevel: 6 },
      teacherToken,
    );
    classId = res.body.data.id;
    code = res.body.data.enrollmentCode;
    await req('POST', '/student/classes/join', { enrollmentCode: code }, studentBToken);
  });

  it('lists the class for the enrolled student and hides the enrollment code — F2.6', async () => {
    const res = await req('GET', '/student/classes', undefined, studentBToken);
    assert.equal(res.status, 200);
    const found = res.body.data.find((c: any) => c.id === classId);
    assert.ok(found, 'enrolled class not listed');
    assert.equal(found.enrollmentCode, undefined, 'enrollment code leaked to a student payload');
    assert.ok(found.teacher?.nickname, 'teacher summary missing');
  });

  it('lets an enrolled student read class detail but not the roster — INV-CLASS-07', async () => {
    const res = await req('GET', `/student/classes/${classId}`, undefined, studentBToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, classId);
    assert.ok(Array.isArray(res.body.data.lessons));
    assert.equal(res.body.data.students, undefined, 'peer roster exposed to a student');
  });

  it('refuses class detail for a student who never joined — CLASS_ACCESS_DENIED', async () => {
    const res = await req('GET', `/student/classes/${classId}`, undefined, studentAToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CLASS_ACCESS_DENIED');
  });

  it('leaves the class by setting status dropped, keeping the row — INV-CLASS-06', async () => {
    const res = await req('DELETE', `/student/classes/${classId}/leave`, undefined, studentBToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'dropped');

    const rows = await prisma.classEnrollment.findMany({ where: { classId } });
    assert.equal(rows.length, 1, 'leaving deleted the enrollment row');
    assert.equal(rows[0].status, 'dropped');
  });

  it('drops the class out of the student list once left', async () => {
    const res = await req('GET', '/student/classes', undefined, studentBToken);
    assert.ok(!res.body.data.some((c: any) => c.id === classId));
  });

  it('blocks class detail after leaving — INV-CLASS-07', async () => {
    const res = await req('GET', `/student/classes/${classId}`, undefined, studentBToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CLASS_ACCESS_DENIED');
  });

  it('refuses a second leave — CLASS_NOT_ENROLLED', async () => {
    const res = await req('DELETE', `/student/classes/${classId}/leave`, undefined, studentBToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'CLASS_NOT_ENROLLED');
  });

  it('refuses leaving a class never joined — CLASS_NOT_ENROLLED', async () => {
    const res = await req('DELETE', `/student/classes/${classId}/leave`, undefined, studentAToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'CLASS_NOT_ENROLLED');
  });

  it('re-joins by reactivating the same row, preserving joinedAt and stamping rejoinedAt', async () => {
    const before = await prisma.classEnrollment.findFirst({ where: { classId } });
    const originalJoinedAt = before!.joinedAt.toISOString();

    const res = await req('POST', '/student/classes/join', { enrollmentCode: code }, studentBToken);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.enrollmentStatus, 'active');

    const rows = await prisma.classEnrollment.findMany({ where: { classId } });
    assert.equal(rows.length, 1, 'a re-join created a second row — unique constraint bypassed');
    assert.equal(rows[0].status, 'active');
    assert.equal(
      rows[0].joinedAt.toISOString(),
      originalJoinedAt,
      'joinedAt was overwritten on re-join — the original enrollment date is lost',
    );
    assert.ok(rows[0].rejoinedAt, 'rejoinedAt was not stamped, so the return is invisible');
    assert.ok(
      rows[0].rejoinedAt!.getTime() >= before!.joinedAt.getTime(),
      'rejoinedAt predates joinedAt',
    );
  });

  it('restores the class to the student list after re-joining', async () => {
    const res = await req('GET', '/student/classes', undefined, studentBToken);
    const found = res.body.data.find((c: any) => c.id === classId);
    assert.ok(found, 'class missing after re-join');
    assert.ok(found.rejoinedAt, 'rejoinedAt not surfaced on the student list');
  });
});
