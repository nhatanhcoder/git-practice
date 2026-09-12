import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { Question, type QuestionDocument } from '../mongodb/schemas/question.schema';
import type { SaveAnswerDto } from './dto/attempt.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AttemptRow = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  totalScore: number | null;
  maxScore: number | null;
  isOfficialGrade: boolean;
};

/**
 * Student attempt lifecycle (03-attempt-lifecycle.md, S-ASGN-2..S-ASGN-7).
 *
 * Ownership is structural: every method takes `studentId` first and no endpoint
 * accepts one. The enrollment gate applies at START (published + active); reads
 * stay open to the owner afterwards because a dropped student keeps past attempts
 * (PERMISSIONS_STUDENT). Teacher grading lives in the teacher lane (module 04) —
 * this service never writes teacherScore, teacherFeedback or the AI columns.
 */
@Injectable()
export class AttemptsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectModel(Question.name) private readonly questions: Model<QuestionDocument>,
  ) {}

  /**
   * INV-ATLP-01/02/03: start (or re-enter) the one official attempt.
   * Fixed 201 with a `resumed` flag — a dynamic status would need `@Res` and
   * bypass the envelope interceptor (same rule as word-bank saves).
   */
  async start(studentId: string, assignmentId: string) {
    if (!UUID_REGEX.test(assignmentId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'assignmentId không đúng định dạng uuid');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.status !== 'published') {
      throw new AppException(ErrorCode.ASSIGNMENT_NOT_FOUND, 'Không tìm thấy bài tập');
    }

    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId: assignment.classId, studentId } },
    });
    if (!enrollment || enrollment.status !== 'active') {
      throw new AppException(ErrorCode.ASSIGNMENT_NOT_FOUND, 'Không tìm thấy bài tập');
    }

    if (assignment.dueDate && assignment.dueDate.getTime() < Date.now()) {
      throw new AppException(ErrorCode.ASSIGNMENT_PAST_DUE, 'Bài tập đã quá hạn nộp');
    }

    const existing = await this.prisma.attempt.findFirst({
      where: { assignmentId, studentId, isOfficialGrade: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      if (existing.status !== 'in_progress') {
        throw new AppException(ErrorCode.ATTEMPT_ALREADY_SUBMITTED, 'Bài làm đã được nộp');
      }
      return { ...(await this.toTakePayload(existing as AttemptRow)), resumed: true };
    }

    try {
      const created = await this.prisma.attempt.create({
        data: {
          assignmentId,
          studentId,
          status: 'in_progress',
          startedAt: new Date(),
          isOfficialGrade: true,
          maxScore: assignment.questionIds.length,
        },
      });
      return { ...(await this.toTakePayload(created as AttemptRow)), resumed: false };
    } catch (err) {
      // INV-ATLP-02: the partial unique index is the race guard — two concurrent
      // first-starts converge on one row; the loser reads it back below.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await this.prisma.attempt.findFirst({
          where: { assignmentId, studentId, isOfficialGrade: true },
          orderBy: { createdAt: 'desc' },
        });
        if (winner && winner.status === 'in_progress') {
          return { ...(await this.toTakePayload(winner as AttemptRow)), resumed: true };
        }
        throw new AppException(ErrorCode.ATTEMPT_ALREADY_SUBMITTED, 'Bài làm đã được nộp');
      }
      throw err;
    }
  }

  /**
   * Take/state payload (S-ASGN-2/5): attempt + questions in `questionIds` order
   * with the student's saved answers attached. INV-ATLP-07: `correctAnswer` and
   * `explanation` never leave the server on this path.
   */
  async getState(studentId: string, attemptId: string) {
    const attempt = await this.assertOwnAttempt(studentId, attemptId);
    return this.toTakePayload(attempt);
  }

  /**
   * INV-ATLP-04/05: auto-save one answer. Past the time limit the server writes
   * nothing and answers 409 (the client refetches state, which the deadline
   * finalizes on submit).
   */
  async saveAnswer(studentId: string, attemptId: string, dto: SaveAnswerDto) {
    if (!UUID_REGEX.test(attemptId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'attemptId không đúng định dạng uuid');
    }

    const attempt = await this.assertOwnAttempt(studentId, attemptId);
    if (attempt.status !== 'in_progress') {
      throw new AppException(ErrorCode.ATTEMPT_ALREADY_SUBMITTED, 'Bài làm đã được nộp, không thể sửa');
    }

    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: attempt.assignmentId },
    });
    if (!assignment.questionIds.includes(dto.questionId)) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        `Câu hỏi ${dto.questionId} không thuộc bài tập này`,
      );
    }

    if (this.isPastDeadline(attempt, assignment.timeLimitMinutes)) {
      throw new AppException(ErrorCode.ATTEMPT_TIME_EXCEEDED, 'Đã hết thời gian làm bài');
    }

    const row = await this.prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      update: {
        selectedOptions: dto.selectedOptions ?? [],
        writtenAnswer: dto.writtenAnswer ?? null,
        savedAt: new Date(),
      },
      create: {
        attemptId,
        questionId: dto.questionId,
        selectedOptions: dto.selectedOptions ?? [],
        writtenAnswer: dto.writtenAnswer ?? null,
        savedAt: new Date(),
      },
    });
    return this.toAnswerDto(row);
  }

  /**
   * INV-ATLP-06/09: submit + server-side MCQ grading in one transaction.
   * A late submit (past the time limit) still finalizes — the submit IS the
   * finalization (INV-ATLP-05).
   */
  async submit(studentId: string, attemptId: string) {
    if (!UUID_REGEX.test(attemptId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'attemptId không đúng định dạng uuid');
    }

    const attempt = await this.assertOwnAttempt(studentId, attemptId);
    if (attempt.status !== 'in_progress') {
      throw new AppException(ErrorCode.ATTEMPT_ALREADY_SUBMITTED, 'Bài làm đã được nộp');
    }

    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: attempt.assignmentId },
    });
    const questions = await this.questions
      .find({ _id: { $in: assignment.questionIds } })
      .lean();
    const byId = new Map(questions.map((q) => [String(q._id), q]));
    const existing = await this.prisma.attemptAnswer.findMany({ where: { attemptId } });
    const byQid = new Map(existing.map((a) => [a.questionId, a]));

    const now = new Date();
    const scored = assignment.questionIds.map((qid) => {
      const q = byId.get(qid);
      const row = byQid.get(qid);
      // A question deleted from the bank after publishing scores nothing but
      // still occupies its slot — the attempt stays complete and auditable.
      if (!q || q.skill === 'writing') {
        return {
          questionId: qid,
          selectedOptions: row?.selectedOptions ?? [],
          writtenAnswer: row?.writtenAnswer ?? null,
          autoScore: null as number | null,
          isCorrect: null as boolean | null,
        };
      }
      const score = setsEqual(row?.selectedOptions ?? [], toStringArray(q.correctAnswer)) ? 1 : 0;
      return {
        questionId: qid,
        selectedOptions: row?.selectedOptions ?? [],
        writtenAnswer: null as string | null,
        autoScore: score,
        isCorrect: score === 1,
      };
    });

    // INV-ATLP-06: totalScore lands only when every answer is final. Writing has
    // no teacherScore yet, so mixed assignments stay null until grading.
    const allFinal = scored.every((s) => {
      const q = byId.get(s.questionId);
      return !q || q.skill !== 'writing' ? s.autoScore !== null : false;
    });

    const result = await this.prisma.$transaction(async (tx) => {
      for (const s of scored) {
        await tx.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: s.questionId } },
          update: {
            selectedOptions: s.selectedOptions,
            writtenAnswer: s.writtenAnswer,
            autoScore: s.autoScore,
            isCorrect: s.isCorrect,
            savedAt: now,
          },
          create: {
            attemptId,
            questionId: s.questionId,
            selectedOptions: s.selectedOptions,
            writtenAnswer: s.writtenAnswer,
            autoScore: s.autoScore,
            isCorrect: s.isCorrect,
            savedAt: now,
          },
        });
      }
      return tx.attempt.update({
        where: { id: attemptId },
        data: {
          status: 'submitted',
          submittedAt: now,
          maxScore: assignment.questionIds.length,
          totalScore: allFinal ? scored.reduce((sum, s) => sum + (s.autoScore ?? 0), 0) : null,
        },
      });
    });

    return this.toTakePayload(result as AttemptRow);
  }

  /**
   * INV-ATLP-07/08: result view. `correctAnswer` is revealed only at `graded`
   * (S-ASGN-8 post-grading review); before that the student sees scores and
   * correctness, never the key.
   */
  async getResult(studentId: string, attemptId: string) {
    const attempt = await this.assertOwnAttempt(studentId, attemptId);
    const payload = await this.toTakePayload(attempt);
    if (attempt.status !== 'graded') {
      return payload;
    }
    const withKey = await this.questions
      .find({ _id: { $in: payload.questions.map((q) => q.questionId) } })
      .select({ correctAnswer: 1 })
      .lean();
    const keyById = new Map(withKey.map((q) => [String(q._id), q.correctAnswer ?? null]));
    return {
      ...payload,
      questions: payload.questions.map((q) => ({
        ...q,
        correctAnswer: keyById.get(q.questionId) ?? null,
      })),
    };
  }

  /**
   * INV-ATLP-08: 404 when the attempt does not exist, 403 when it is someone
   * else's (the student-lane code — cross-teacher 404 lives in module 04).
   */
  private async assertOwnAttempt(studentId: string, attemptId: string): Promise<AttemptRow> {
    if (!UUID_REGEX.test(attemptId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'attemptId không đúng định dạng uuid');
    }
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) {
      throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND, 'Không tìm thấy bài làm');
    }
    if (attempt.studentId !== studentId) {
      throw new AppException(ErrorCode.ATTEMPT_NOT_OWNER, 'Đây không phải bài làm của bạn');
    }
    return attempt as AttemptRow;
  }

  private isPastDeadline(attempt: AttemptRow, timeLimitMinutes: number | null): boolean {
    if (!timeLimitMinutes) return false;
    return Date.now() > attempt.startedAt.getTime() + timeLimitMinutes * 60_000;
  }

  private async toTakePayload(attempt: AttemptRow) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: attempt.assignmentId },
    });
    const [questions, answers] = await Promise.all([
      this.questions.find({ _id: { $in: assignment.questionIds } }).lean(),
      this.prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } }),
    ]);
    const byId = new Map(questions.map((q) => [String(q._id), q]));
    const answerByQid = new Map(answers.map((a) => [a.questionId, this.toAnswerDto(a)]));

    return {
      attempt: this.toAttemptDto(attempt),
      assignment: {
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        status: assignment.status,
        dueDate: assignment.dueDate?.toISOString() ?? null,
        timeLimitMinutes: assignment.timeLimitMinutes,
      },
      questions: assignment.questionIds.map((qid) => {
        const q = byId.get(qid);
        return {
          questionId: qid,
          skill: q?.skill ?? null,
          subType: q?.subType ?? null,
          hskLevel: q?.hskLevel ?? null,
          content: q?.content ?? null,
          options: (q?.options ?? []).map((o: { id: string; text: string }) => ({
            id: o.id,
            text: o.text,
          })),
          // INV-ATLP-07: no correctAnswer / explanation on the take path, ever.
          answer: answerByQid.get(qid) ?? null,
        };
      }),
      serverNow: new Date().toISOString(),
    };
  }

  private toAttemptDto(a: AttemptRow) {
    return {
      id: a.id,
      assignmentId: a.assignmentId,
      status: a.status,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
      gradedAt: a.gradedAt?.toISOString() ?? null,
      totalScore: a.totalScore,
      maxScore: a.maxScore,
      isOfficialGrade: a.isOfficialGrade,
    };
  }

  private toAnswerDto(a: {
    questionId: string;
    selectedOptions: string[];
    writtenAnswer: string | null;
    autoScore: number | null;
    teacherScore: number | null;
    aiSuggestedScore: number | null;
    aiFeedback: string | null;
    teacherFeedback: string | null;
    isCorrect: boolean | null;
    savedAt: Date | null;
  }) {
    return {
      questionId: a.questionId,
      selectedOptions: a.selectedOptions,
      writtenAnswer: a.writtenAnswer,
      autoScore: a.autoScore,
      teacherScore: a.teacherScore,
      aiSuggestedScore: a.aiSuggestedScore,
      aiFeedback: a.aiFeedback,
      teacherFeedback: a.teacherFeedback,
      isCorrect: a.isCorrect,
      savedAt: a.savedAt?.toISOString() ?? null,
    };
  }
}

function toStringArray(v: string | string[] | null | undefined): string[] {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}
