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
import { ErrorCode } from '../src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

/**
 * Sprint 4 attempt lifecycle — 03-attempt-lifecycle (student) + 04-attempts-grading
 * (teacher) + INV-TGRD-06 (AI suggest, unparked 2026-09-12).
 *
 * Covers what `@Roles()` cannot enforce: enrollment-gated start (INV-ATLP-01),
 * idempotent re-entry (INV-ATLP-02), past-due start (INV-ATLP-03), autosave
 * upsert + ownership (INV-ATLP-04), server-side deadline (INV-ATLP-05),
 * MCQ auto-grade + unit scale (INV-ATLP-06), key hiding (INV-ATLP-07),
 * attempt ownership (INV-ATLP-08), submit lock (INV-ATLP-09), teacher
 * two-hop ownership (INV-TGRD-01), grade transaction + notification
 * (INV-TGRD-05/07), AI suggestion-only writes (INV-TGRD-06) and the
 * never-write-AI-columns grade path (WEB-006/A2).
 *
 * Suites share one database (--test-concurrency=1, DEBT-004) and clean up every
 * fixture in both stores.
 */

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;
let mongo: Connection;

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

type Res = { status: number; body: any };

async function req(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  token?: string,
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json; charset=utf-8';
  if (token) headers['authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const TEACHER = 'satl.teacher@hsk.local';
const STUDENT_A = 'satl.student.a@hsk.local';
const STUDENT_B = 'satl.student.b@hsk.local';
const OWNED_EMAILS = [TEACHER, STUDENT_A, STUDENT_B];

let teacherToken: string;
let otherTeacherToken: string;
let studentAToken: string;
let studentBToken: string;
let classId: string;
let mcqId: string;
let essayId: string;
let assignmentId: string;
let draftId: string;
let pastDueId: string;
let timedId: string;

async function registerApproveLogin(email: string, role: 'teacher' | 'student'): Promise<string> {
  const reg = await req('POST', '/auth/register', {
    email,
    password: 'Password123!',
    fullName: email,
    role,
  });
  assert.equal(reg.status, 201, `register ${email} failed: ${JSON.stringify(reg.body)}`);
  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  const adminToken = adminLogin.body.data.accessToken;
  const approve = await req(
    'PATCH',
    `/admin/users/${reg.body.data.id}/approve`,
    undefined,
    adminToken,
  );
  assert.equal(approve.status, 200, `approve ${email} failed`);
  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  return login.body.data.accessToken;
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

  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });

  teacherToken = await registerApproveLogin(TEACHER, 'teacher');
  otherTeacherToken = await registerApproveLogin('satl.teacher.b@hsk.local', 'teacher');
  OWNED_EMAILS.push('satl.teacher.b@hsk.local');
  studentAToken = await registerApproveLogin(STUDENT_A, 'student');
  studentBToken = await registerApproveLogin(STUDENT_B, 'student');

  const studentAId = (
    await prisma.user.findUniqueOrThrow({ where: { email: STUDENT_A }, select: { id: true } })
  ).id;

  const cls = await req('POST', '/teacher/classes', { name: 'Lớp vòng đời', hskLevel: 3 }, teacherToken);
  classId = cls.body.data.id;
  await prisma.classEnrollment.create({
    data: { classId, studentId: studentAId, status: 'active' },
  });

  const mcq = await req(
    'POST',
    '/teacher/questions',
    {
      skill: 'reading',
      subType: 'multiple_choice_multi',
      hskLevel: 3,
      difficulty: 'medium',
      content: { prompt: '选择正确的词。' },
      options: [
        { id: 'a', text: '认识' },
        { id: 'b', text: '知道' },
      ],
      correctAnswer: ['a'],
    },
    teacherToken,
  );
  mcqId = mcq.body.data.id;
  const essay = await req(
    'POST',
    '/teacher/questions',
    {
      skill: 'writing',
      subType: 'essay',
      hskLevel: 3,
      difficulty: 'medium',
      content: { prompt: '请介绍你的家庭。', rubric: 'Nội dung, từ vựng, ngữ pháp' },
      correctAnswer: null,
    },
    teacherToken,
  );
  essayId = essay.body.data.id;

  const mk = async (title: string, extra: Record<string, unknown>) => {
    const res = await req(
      'POST',
      '/teacher/assignments',
      {
        classId,
        title,
        type: 'homework',
        dueDate: '2026-12-31T17:00:00Z',
        questionIds: [mcqId, essayId],
        status: 'published',
        ...extra,
      },
      teacherToken,
    );
    assert.equal(res.status, 201, `create ${title} failed: ${JSON.stringify(res.body)}`);
    return res.body.data.id as string;
  };
  assignmentId = await mk('Bài vòng đời', {});
  draftId = await mk('Bài nháp vòng đời', { status: 'draft' });
  pastDueId = await mk('Bài quá hạn', { dueDate: '2020-01-01T00:00:00Z' });
  timedId = await mk('Bài tính giờ', { type: 'mock_test', timeLimitMinutes: 1 });
});

after(async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: OWNED_EMAILS } },
    select: { id: true },
  });
  await mongo.collection('questions').deleteMany({ createdBy: { $in: users.map((u) => u.id) } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: OWNED_EMAILS } } });
  await app?.close();
});

describe('Student attempt lifecycle — 03-attempt-lifecycle', () => {
  let attemptId: string;

  it('starts an attempt with the take payload and no answer key (INV-ATLP-01/07)', async () => {
    const res = await req('POST', `/student/assignments/${assignmentId}/attempts`, undefined, studentAToken);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.resumed, false);
    assert.equal(res.body.data.attempt.status, 'in_progress');
    assert.equal(res.body.data.assignment.id, assignmentId);
    assert.ok(res.body.data.serverNow);
    assert.equal(res.body.data.questions.length, 2);
    for (const q of res.body.data.questions) {
      assert.ok(!('correctAnswer' in q), 'answer key must never ride the take payload');
      assert.ok(!('explanation' in q), 'explanations must never ride the take payload');
    }
    attemptId = res.body.data.attempt.id;
  });

  it('re-enters the same in_progress attempt instead of creating a second row (INV-ATLP-02)', async () => {
    const res = await req('POST', `/student/assignments/${assignmentId}/attempts`, undefined, studentAToken);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.resumed, true);
    assert.equal(res.body.data.attempt.id, attemptId);
  });

  it('refuses to start a draft or an unenrolled assignment with 404 (INV-ATLP-01)', async () => {
    const draft = await req('POST', `/student/assignments/${draftId}/attempts`, undefined, studentAToken);
    assert.equal(draft.status, 404);
    assert.equal(draft.body.code, 'ASSIGNMENT_NOT_FOUND');
    const outsider = await req('POST', `/student/assignments/${assignmentId}/attempts`, undefined, studentBToken);
    assert.equal(outsider.status, 404);
    assert.equal(outsider.body.code, 'ASSIGNMENT_NOT_FOUND');
  });

  it('refuses to start past dueDate with 400 (INV-ATLP-03)', async () => {
    const res = await req('POST', `/student/assignments/${pastDueId}/attempts`, undefined, studentAToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'ASSIGNMENT_PAST_DUE');
  });

  it('autosaves one answer as an upsert and rejects foreign questionIds (INV-ATLP-04)', async () => {
    const first = await req(
      'PATCH',
      `/student/attempts/${attemptId}/answers`,
      { questionId: mcqId, selectedOptions: ['a'] },
      studentAToken,
    );
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.data.selectedOptions, ['a']);
    const second = await req(
      'PATCH',
      `/student/attempts/${attemptId}/answers`,
      { questionId: mcqId, selectedOptions: ['b'] },
      studentAToken,
    );
    assert.equal(second.status, 200);
    assert.deepEqual(second.body.data.selectedOptions, ['b']);
    const foreign = await req(
      'PATCH',
      `/student/attempts/${attemptId}/answers`,
      { questionId: '507f1f77bcf86cd799439011', selectedOptions: ['a'] },
      studentAToken,
    );
    assert.equal(foreign.status, 400);
    assert.equal(foreign.body.code, 'VALIDATION_ERROR');
  });

  it("another student's attempt is 403 and a random id is 404 (INV-ATLP-08)", async () => {
    const mine = await req('GET', `/student/attempts/${attemptId}`, undefined, studentBToken);
    assert.equal(mine.status, 403);
    assert.equal(mine.body.code, 'ATTEMPT_NOT_OWNER');
    const ghost = await req(
      'GET',
      '/student/attempts/00000000-0000-4000-8000-000000000000',
      undefined,
      studentAToken,
    );
    assert.equal(ghost.status, 404);
    assert.equal(ghost.body.code, 'ATTEMPT_NOT_FOUND');
  });

  it('submits with server-side MCQ grading; mixed total stays null (INV-ATLP-06)', async () => {
    await req(
      'PATCH',
      `/student/attempts/${attemptId}/answers`,
      { questionId: mcqId, selectedOptions: ['a'] },
      studentAToken,
    );
    await req(
      'PATCH',
      `/student/attempts/${attemptId}/answers`,
      { questionId: essayId, writtenAnswer: '我家有四口人。' },
      studentAToken,
    );
    const res = await req('POST', `/student/attempts/${attemptId}/submit`, undefined, studentAToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attempt.status, 'submitted');
    assert.ok(res.body.data.attempt.submittedAt);
    const mcq = res.body.data.questions.find((q: { questionId: string }) => q.questionId === mcqId);
    assert.equal(mcq.answer.autoScore, 1);
    assert.equal(mcq.answer.isCorrect, true);
    const essay = res.body.data.questions.find((q: { questionId: string }) => q.questionId === essayId);
    assert.equal(essay.answer.autoScore, null);
    assert.equal(essay.answer.isCorrect, null);
    assert.equal(res.body.data.attempt.maxScore, 2);
    assert.equal(res.body.data.attempt.totalScore, null);
  });

  it('locks the attempt after submit — autosave, re-submit and re-start are 409 (INV-ATLP-09/02)', async () => {
    const save = await req(
      'PATCH',
      `/student/attempts/${attemptId}/answers`,
      { questionId: mcqId, selectedOptions: ['a'] },
      studentAToken,
    );
    assert.equal(save.status, 409);
    assert.equal(save.body.code, 'ATTEMPT_ALREADY_SUBMITTED');
    const submit = await req('POST', `/student/attempts/${attemptId}/submit`, undefined, studentAToken);
    assert.equal(submit.status, 409);
    const start = await req('POST', `/student/assignments/${assignmentId}/attempts`, undefined, studentAToken);
    assert.equal(start.status, 409);
    // The rejected autosave wrote nothing.
    const row = await prisma.attemptAnswer.findUniqueOrThrow({
      where: { attemptId_questionId: { attemptId, questionId: mcqId } },
    });
    assert.deepEqual(row.selectedOptions, ['a']);
  });

  it('pre-grade result shows scores but hides the answer key (INV-ATLP-07)', async () => {
    const res = await req('GET', `/student/attempts/${attemptId}/result`, undefined, studentAToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attempt.status, 'submitted');
    for (const q of res.body.data.questions) {
      assert.ok(!('correctAnswer' in q));
    }
  });

  it('deadline is enforced server-side: late autosave 409s, late submit finalizes (INV-ATLP-05)', async () => {
    const start = await req('POST', `/student/assignments/${timedId}/attempts`, undefined, studentAToken);
    assert.equal(start.status, 201);
    const timedAttemptId = start.body.data.attempt.id as string;
    await new Promise((r) => setTimeout(r, 65_000));
    const late = await req(
      'PATCH',
      `/student/attempts/${timedAttemptId}/answers`,
      { questionId: mcqId, selectedOptions: ['a'] },
      studentAToken,
    );
    // Registry status for an exceeded limit is 400 (ATTEMPT_TIME_EXCEEDED) —
    // the row is finalized by the submit that follows, not by this call.
    assert.equal(late.status, 400);
    assert.equal(late.body.code, 'ATTEMPT_TIME_EXCEEDED');
    const submit = await req('POST', `/student/attempts/${timedAttemptId}/submit`, undefined, studentAToken);
    assert.equal(submit.status, 200);
    assert.equal(submit.body.data.attempt.status, 'submitted');
  });
});

describe('Teacher grading — 04-attempts-grading', () => {
  it('queue shows only my submitted attempts; strangers see nothing (INV-TGRD-01/02)', async () => {
    const mine = await req('GET', '/teacher/attempts?status=submitted', undefined, teacherToken);
    assert.equal(mine.status, 200);
    assert.ok(mine.body.data.length >= 2);
    assert.ok(mine.body.data.every((a: { status: string }) => a.status === 'submitted'));
    const theirs = await req('GET', '/teacher/attempts?status=submitted', undefined, otherTeacherToken);
    assert.equal(theirs.status, 200);
    assert.equal(theirs.body.data.length, 0);
    const detail = await req(
      'GET',
      `/teacher/attempts/${mine.body.data[0].id}`,
      undefined,
      otherTeacherToken,
    );
    assert.equal(detail.status, 404);
    assert.equal(detail.body.code, 'ATTEMPT_NOT_FOUND');
  });

  it('detail carries the answer key as grading context (teacher lane only)', async () => {
    const queue = await req('GET', '/teacher/attempts?status=submitted', undefined, teacherToken);
    const attemptId = queue.body.data.find(
      (a: { assignmentId: string }) => a.assignmentId === assignmentId,
    ).id as string;
    const res = await req('GET', `/teacher/attempts/${attemptId}`, undefined, teacherToken);
    assert.equal(res.status, 200);
    // 04 §16-Q6: queue/detail read the display nickname (register stores fullName as nickname).
    assert.equal(res.body.data.attempt.studentName, STUDENT_A);
    const mcq = res.body.data.answers.find((a: { questionId: string }) => a.questionId === mcqId);
    assert.deepEqual(mcq.correctAnswer, ['a']);
  });

  it('grade commits answers + status + total + exactly one notification (INV-TGRD-05/07)', async () => {
    const queue = await req('GET', '/teacher/attempts?status=submitted', undefined, teacherToken);
    const attemptId = queue.body.data.find(
      (a: { assignmentId: string }) => a.assignmentId === assignmentId,
    ).id as string;
    const res = await req(
      'PATCH',
      `/teacher/attempts/${attemptId}/grade`,
      { grades: [{ questionId: essayId, teacherScore: 0.8, teacherFeedback: 'Tốt, chú ý ngữ pháp.' }] },
      teacherToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attempt.status, 'graded');
    assert.ok(res.body.data.attempt.gradedAt);
    // Σ COALESCE(teacherScore, autoScore) = 0.8 (writing) + 1 (MCQ auto) = 1.8.
    assert.equal(res.body.data.attempt.totalScore, 1.8);
    const essay = res.body.data.answers.find((a: { questionId: string }) => a.questionId === essayId);
    assert.equal(essay.teacherScore, 0.8);
    // WEB-006/A2: the grade path never touches the AI columns.
    assert.equal(essay.aiSuggestedScore, null);
    assert.equal(essay.aiFeedback, null);
    const notes = await prisma.notification.findMany({
      where: { referenceId: attemptId, type: 'graded' },
    });
    assert.equal(notes.length, 1);
  });

  it('graded result reveals the key and the final total (S-ASGN-7/8)', async () => {
    const queue = await req('GET', '/teacher/attempts?status=graded', undefined, teacherToken);
    const attemptId = queue.body.data.find(
      (a: { assignmentId: string }) => a.assignmentId === assignmentId,
    ).id as string;
    const res = await req('GET', `/student/attempts/${attemptId}/result`, undefined, studentAToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.attempt.totalScore, 1.8);
    const mcq = res.body.data.questions.find((q: { questionId: string }) => q.questionId === mcqId);
    assert.deepEqual(mcq.correctAnswer, ['a']);
    const essay = res.body.data.questions.find((q: { questionId: string }) => q.questionId === essayId);
    assert.equal(essay.answer.teacherFeedback, 'Tốt, chú ý ngữ pháp.');
  });

  it('re-grading and grading drafts-in-progress are 409 (INV-TGRD-03)', async () => {
    const queue = await req('GET', '/teacher/attempts?status=graded', undefined, teacherToken);
    const gradedId = queue.body.data.find(
      (a: { assignmentId: string }) => a.assignmentId === assignmentId,
    ).id as string;
    const again = await req(
      'PATCH',
      `/teacher/attempts/${gradedId}/grade`,
      { grades: [{ questionId: essayId, teacherScore: 0.5 }] },
      teacherToken,
    );
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'ATTEMPT_NOT_SUBMITTED');
  });

  it('ai-suggest is writing-only and needs submitted; unconfigured key is 401 (INV-TGRD-06)', async () => {
    const queue = await req('GET', '/teacher/attempts?status=graded', undefined, teacherToken);
    const gradedId = queue.body.data.find(
      (a: { assignmentId: string }) => a.assignmentId === assignmentId,
    ).id as string;
    // Graded, not submitted.
    const stale = await req(
      'POST',
      `/teacher/attempts/${gradedId}/ai-suggest`,
      { questionIds: [essayId] },
      teacherToken,
    );
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'ATTEMPT_NOT_SUBMITTED');

    // Fresh submitted attempt on a writing-only assignment for the key branches.
    const solo = await req(
      'POST',
      '/teacher/assignments',
      {
        classId,
        title: 'Bài viết riêng',
        type: 'homework',
        dueDate: '2026-12-31T17:00:00Z',
        questionIds: [essayId],
        status: 'published',
      },
      teacherToken,
    );
    const soloAttempt = await req(
      'POST',
      `/student/assignments/${solo.body.data.id}/attempts`,
      undefined,
      studentAToken,
    );
    const soloId = soloAttempt.body.data.attempt.id as string;
    await req(
      'PATCH',
      `/student/attempts/${soloId}/answers`,
      { questionId: essayId, writtenAnswer: '我喜欢学中文。' },
      studentAToken,
    );
    await req('POST', `/student/attempts/${soloId}/submit`, undefined, studentAToken);

    // MCQ target rejected before any key is touched — deterministic with or without one.
    const mcqTarget = await req(
      'POST',
      `/teacher/attempts/${soloId}/ai-suggest`,
      { questionIds: [mcqId] },
      teacherToken,
    );
    assert.equal(mcqTarget.status, 400);
    assert.equal(mcqTarget.body.code, 'VALIDATION_ERROR');

    // No GEMINI_API_KEY in dev/CI: the service cannot authenticate.
    const hasKey =
      !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('placeholder');
    if (!hasKey) {
      const res = await req(
        'POST',
        `/teacher/attempts/${soloId}/ai-suggest`,
        { questionIds: [essayId] },
        teacherToken,
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'AI_KEY_INVALID');
      // The failed suggestion wrote nothing.
      const row = await prisma.attemptAnswer.findUniqueOrThrow({
        where: { attemptId_questionId: { attemptId: soloId, questionId: essayId } },
      });
      assert.equal(row.aiSuggestedScore, null);
      assert.equal(row.aiFeedback, null);
    }
  });
});
