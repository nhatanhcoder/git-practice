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

// Ownership matrix for GET /student/classes/:classId/lessons/:lessonId (S-LESSON-2).
// Builds and tears down every account it uses; never reuses seeded students.
const TEACHER_EMAIL = 'test.slesson.teacher@hsk.local';
const STUDENT_A_EMAIL = 'test.slesson.student.a@hsk.local';
const STUDENT_B_EMAIL = 'test.slesson.student.b@hsk.local';
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

// Heterogeneous API envelopes are asserted per test case.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: number; headers: Headers; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
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

let app: INestApplication;
let base: string;
let prisma: PrismaService;

let adminToken: string;
let teacherToken: string;
let studentAToken: string;
let studentBToken: string;

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

  teacherToken = (await registerApproveLogin(TEACHER_EMAIL, 'GV Chi Tiết Bài Học', 'teacher')).token;
  studentAToken = (await registerApproveLogin(STUDENT_A_EMAIL, 'Học Sinh Bài Học A', 'student')).token;
  studentBToken = (await registerApproveLogin(STUDENT_B_EMAIL, 'Học Sinh Bài Học B', 'student')).token;
});

after(async () => {
  // Scoped to the accounts this suite created. Classes, enrollments and lessons cascade off them.
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

describe('Student lesson detail — S-LESSON-2 ownership matrix', () => {
  let classAId: string;
  let classACode: string;
  let lessonAId: string;
  let classBId: string;
  let lessonBId: string;

  it('sets up two classes with one lesson each, owned by the test teacher', async () => {
    const classA = await req(
      'POST',
      '/teacher/classes',
      { name: 'HSK 3 Bài Học A', hskLevel: 3 },
      teacherToken,
    );
    assert.equal(classA.status, 201);
    classAId = classA.body.data.id;
    classACode = classA.body.data.enrollmentCode;

    const lessonA = await req(
      'POST',
      `/teacher/classes/${classAId}/lessons`,
      { title: 'Bài 1: Chào hỏi', contentType: 'text', description: 'Nội dung chào hỏi' },
      teacherToken,
    );
    assert.equal(lessonA.status, 201);
    lessonAId = lessonA.body.data.id;

    const classB = await req(
      'POST',
      '/teacher/classes',
      { name: 'HSK 3 Bài Học B', hskLevel: 3 },
      teacherToken,
    );
    assert.equal(classB.status, 201);
    classBId = classB.body.data.id;

    const lessonB = await req(
      'POST',
      `/teacher/classes/${classBId}/lessons`,
      { title: 'Bài 1: Tạm biệt', contentType: 'text' },
      teacherToken,
    );
    assert.equal(lessonB.status, 201);
    lessonBId = lessonB.body.data.id;
  });

  it('student A joins class A', async () => {
    const res = await req('POST', '/student/classes/join', { enrollmentCode: classACode }, studentAToken);
    assert.equal(res.status, 201);
  });

  it('enrolled student reads the lesson with ENTITY_LESSON fields', async () => {
    const res = await req('GET', `/student/classes/${classAId}/lessons/${lessonAId}`, undefined, studentAToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, lessonAId);
    assert.equal(res.body.data.classId, classAId);
    assert.equal(res.body.data.title, 'Bài 1: Chào hỏi');
    assert.equal(res.body.data.contentType, 'text');
    assert.equal(res.body.data.orderIndex, 1);
    // The enrollment code is the class invite credential — it must never leak on a student payload.
    assert.ok(!('enrollmentCode' in res.body.data));
  });

  it('rejects a student never enrolled in the class with CLASS_ACCESS_DENIED (403)', async () => {
    const res = await req('GET', `/student/classes/${classAId}/lessons/${lessonAId}`, undefined, studentBToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CLASS_ACCESS_DENIED');
  });

  it('rejects a lesson from another class with LESSON_NOT_FOUND (404), not a leak', async () => {
    const res = await req('GET', `/student/classes/${classAId}/lessons/${lessonBId}`, undefined, studentAToken);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'LESSON_NOT_FOUND');
  });

  it('rejects an unknown lesson id with LESSON_NOT_FOUND (404)', async () => {
    const res = await req(
      'GET',
      `/student/classes/${classAId}/lessons/00000000-0000-4000-8000-000000000000`,
      undefined,
      studentAToken,
    );
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'LESSON_NOT_FOUND');
  });

  it('rejects malformed ids with VALIDATION_ERROR (400)', async () => {
    const badClass = await req(
      'GET',
      `/student/classes/not-a-uuid/lessons/${lessonAId}`,
      undefined,
      studentAToken,
    );
    assert.equal(badClass.status, 400);
    assert.equal(badClass.body.code, 'VALIDATION_ERROR');

    const badLesson = await req(
      'GET',
      `/student/classes/${classAId}/lessons/not-a-uuid`,
      undefined,
      studentAToken,
    );
    assert.equal(badLesson.status, 400);
    assert.equal(badLesson.body.code, 'VALIDATION_ERROR');
  });

  it('rejects a teacher calling the student route with AUTH_INSUFFICIENT_ROLE (403)', async () => {
    // @Roles('student') proves the caller is *a* student; the class owner is still the wrong role here.
    const res = await req('GET', `/student/classes/${classAId}/lessons/${lessonAId}`, undefined, teacherToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'AUTH_INSUFFICIENT_ROLE');
  });

  it('rejects an anonymous call with 401', async () => {
    const res = await req('GET', `/student/classes/${classAId}/lessons/${lessonAId}`);
    assert.equal(res.status, 401);
  });

  it('rejects a dropped enrollment with CLASS_ACCESS_DENIED (403)', async () => {
    const leave = await req('DELETE', `/student/classes/${classAId}/leave`, undefined, studentAToken);
    assert.equal(leave.status, 200);

    const res = await req('GET', `/student/classes/${classAId}/lessons/${lessonAId}`, undefined, studentAToken);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'CLASS_ACCESS_DENIED');
  });
});
