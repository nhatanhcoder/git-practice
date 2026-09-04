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

type Res = {
  status: number;
  headers: Headers;
  body: any;
};

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

  return {
    status: res.status,
    headers: res.headers,
    body: await res.json().catch(() => null),
  };
}

let teacherToken: string;
let anotherTeacherToken: string;
let classId: string;

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

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  const adminToken = adminLogin.body.data.accessToken;

  // Teacher 1
  const regT1 = await req('POST', '/auth/register', {
    email: 'lessons.teacher1@hsk.local',
    password: 'Password123!',
    fullName: 'GV Bài Học 1',
    role: 'teacher',
  });
  await req('PATCH', `/admin/users/${regT1.body.data.id}/approve`, undefined, adminToken);
  const t1Login = await req('POST', '/auth/login', {
    email: 'lessons.teacher1@hsk.local',
    password: 'Password123!',
  });
  teacherToken = t1Login.body.data.accessToken;

  // Teacher 2
  const regT2 = await req('POST', '/auth/register', {
    email: 'lessons.teacher2@hsk.local',
    password: 'Password123!',
    fullName: 'GV Bài Học 2',
    role: 'teacher',
  });
  await req('PATCH', `/admin/users/${regT2.body.data.id}/approve`, undefined, adminToken);
  const t2Login = await req('POST', '/auth/login', {
    email: 'lessons.teacher2@hsk.local',
    password: 'Password123!',
  });
  anotherTeacherToken = t2Login.body.data.accessToken;

  // Create active class
  const classRes = await req(
    'POST',
    '/teacher/classes',
    { name: 'Lớp Học Ngữ Pháp', hskLevel: 2 },
    teacherToken,
  );
  classId = classRes.body.data.id;
});

after(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: ['lessons.teacher1@hsk.local', 'lessons.teacher2@hsk.local'] } },
  });
  await app?.close();
});

describe('Teacher Lessons API', () => {
  let lesson1Id: string;
  let lesson2Id: string;

  it('creates lessons with auto-incrementing orderIndex', async () => {
    const res1 = await req(
      'POST',
      `/teacher/classes/${classId}/lessons`,
      { title: 'Bài 1: Giới thiệu', contentType: 'text' },
      teacherToken,
    );
    assert.equal(res1.status, 201);
    assert.equal(res1.body.data.title, 'Bài 1: Giới thiệu');
    assert.equal(res1.body.data.orderIndex, 1);
    lesson1Id = res1.body.data.id;

    const res2 = await req(
      'POST',
      `/teacher/classes/${classId}/lessons`,
      { title: 'Bài 2: Từ vựng mở rộng', contentType: 'video' },
      teacherToken,
    );
    assert.equal(res2.status, 201);
    assert.equal(res2.body.data.title, 'Bài 2: Từ vựng mở rộng');
    assert.equal(res2.body.data.orderIndex, 2);
    lesson2Id = res2.body.data.id;
  });

  it('lists lessons of a class sorted by orderIndex', async () => {
    const res = await req('GET', `/teacher/classes/${classId}/lessons`, undefined, teacherToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.data[0].id, lesson1Id);
    assert.equal(res.body.data[1].id, lesson2Id);
  });

  it('gets single lesson detail', async () => {
    const res = await req('GET', `/teacher/lessons/${lesson1Id}`, undefined, teacherToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, lesson1Id);
    assert.equal(res.body.data.title, 'Bài 1: Giới thiệu');
  });

  it('updates a lesson', async () => {
    const res = await req(
      'PATCH',
      `/teacher/lessons/${lesson1Id}`,
      { title: 'Bài 1: Giới thiệu (Cập nhật)' },
      teacherToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'Bài 1: Giới thiệu (Cập nhật)');
  });

  it('forbids another teacher from modifying lessons', async () => {
    const res = await req(
      'PATCH',
      `/teacher/lessons/${lesson1Id}`,
      { title: 'Hacked' },
      anotherTeacherToken,
    );
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'LESSON_ACCESS_DENIED');
  });

  it('reorders lessons transactionally without unique constraint collision', async () => {
    const res = await req(
      'PATCH',
      `/teacher/classes/${classId}/lessons/reorder`,
      {
        items: [
          { id: lesson1Id, orderIndex: 2 },
          { id: lesson2Id, orderIndex: 1 },
        ],
      },
      teacherToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data[0].id, lesson2Id);
    assert.equal(res.body.data[0].orderIndex, 1);
    assert.equal(res.body.data[1].id, lesson1Id);
    assert.equal(res.body.data[1].orderIndex, 2);
  });

  it('rejects a partial reorder payload instead of colliding on the unique index', async () => {
    // The class has two lessons. Moving only one of them to index 1 leaves the other
    // still holding index 1, which `@@unique([classId, orderIndex])` cannot allow — the
    // two-step +10000 shift used to fail halfway with a raw P2002. The DTO's
    // ArrayMinSize(1) explicitly permits this payload, so the service has to reject it.
    const res = await req(
      'PATCH',
      `/teacher/classes/${classId}/lessons/reorder`,
      { items: [{ id: lesson1Id, orderIndex: 1 }] },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects a reorder payload that names the same lesson twice', async () => {
    const res = await req(
      'PATCH',
      `/teacher/classes/${classId}/lessons/reorder`,
      {
        items: [
          { id: lesson1Id, orderIndex: 1 },
          { id: lesson1Id, orderIndex: 2 },
        ],
      },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects duplicate orderIndex values', async () => {
    // Both rows would be shifted to the same temporary index in step one, so even the
    // collision-avoidance step collides.
    const res = await req(
      'PATCH',
      `/teacher/classes/${classId}/lessons/reorder`,
      {
        items: [
          { id: lesson1Id, orderIndex: 1 },
          { id: lesson2Id, orderIndex: 1 },
        ],
      },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects orderIndex values outside 1..N', async () => {
    const res = await req(
      'PATCH',
      `/teacher/classes/${classId}/lessons/reorder`,
      {
        items: [
          { id: lesson1Id, orderIndex: 1 },
          { id: lesson2Id, orderIndex: 5 },
        ],
      },
      teacherToken,
    );
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('leaves the ordering untouched after every rejected reorder', async () => {
    // The rejections above must not have half-applied. After the successful swap the
    // order is lesson2, lesson1 — and it should still be exactly that.
    const res = await req('GET', `/teacher/classes/${classId}/lessons`, undefined, teacherToken);
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((l: { id: string; orderIndex: number }) => [l.id, l.orderIndex]),
      [
        [lesson2Id, 1],
        [lesson1Id, 2],
      ],
    );
  });

  it('deletes a lesson and re-packs orderIndex', async () => {
    const deleteRes = await req('DELETE', `/teacher/lessons/${lesson2Id}`, undefined, teacherToken);
    assert.equal(deleteRes.status, 200);

    const listRes = await req('GET', `/teacher/classes/${classId}/lessons`, undefined, teacherToken);
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 1);
    assert.equal(listRes.body.data[0].id, lesson1Id);
    assert.equal(listRes.body.data[0].orderIndex, 1);
  });
});
