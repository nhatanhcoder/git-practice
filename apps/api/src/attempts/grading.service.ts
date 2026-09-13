import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { Question, type QuestionDocument } from '../mongodb/schemas/question.schema';
import { AiSuggestService } from './ai-suggest.service';
import type { GradeAttemptDto, ListAttemptsQuery } from './dto/grading.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Teacher grading lane (04-attempts-grading.md, T-GRADE-1..5).
 *
 * INV-TGRD-01: ownership is two hops (`attempt → assignment → teacherId`),
 * checked in the service. A foreign attempt is 404, never 403 — existence
 * must not leak across teachers (§16-Q5). INV-TGRD-08: grade writes
 * teacherScore/teacherFeedback only — the AI columns belong to ai-suggest
 * (INV-TGRD-06), autoScore/answers belong to the student lane.
 */
@Injectable()
export class GradingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectModel(Question.name) private readonly questions: Model<QuestionDocument>,
    @Inject(AiSuggestService) private readonly aiSuggest: AiSuggestService,
  ) {}

  /**
   * INV-TGRD-02: queue of attempts on the caller's assignments, default
   * `submitted`. `studentName` reads `User.nickname` (04 §16-Q6).
   */
  async queue(teacherId: string, query: ListAttemptsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      status: (query.status ?? 'submitted') as 'submitted' | 'graded',
      assignment: {
        teacherId,
        ...(query.assignmentId ? { id: query.assignmentId } : {}),
        ...(query.classId ? { classId: query.classId } : {}),
      },
    };
    const [rows, total] = await Promise.all([
      this.prisma.attempt.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignment: { select: { id: true, title: true, classId: true } },
          student: { select: { id: true, nickname: true } },
        },
      }),
      this.prisma.attempt.count({ where }),
    ]);
    const classIds = [...new Set(rows.map((r) => r.assignment.classId))];
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
    });
    const classNameById = new Map(classes.map((c) => [c.id, c.name]));
    return {
      data: rows.map((r) => ({
        id: r.id,
        assignmentId: r.assignment.id,
        assignmentTitle: r.assignment.title,
        classId: r.assignment.classId,
        className: classNameById.get(r.assignment.classId) ?? null,
        studentId: r.student.id,
        studentName: r.student.nickname,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        submittedAt: r.submittedAt?.toISOString() ?? null,
        totalScore: r.totalScore,
        maxScore: r.maxScore,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Attempt + answers in `questionIds` order, joined with MongoDB question
   * payloads. Teachers authored the questions, so `correctAnswer` is grading
   * context here (the student lane strips it — 03-attempt-lifecycle INV-ATLP-07).
   */
  async detail(teacherId: string, attemptId: string) {
    const attempt = await this.assertTeacherAttempt(teacherId, attemptId);
    return this.toDetailPayload(attempt);
  }

  /**
   * INV-TGRD-03/05/07: grade a `submitted` attempt. One transaction: answer
   * writes + attempt (`graded`, `gradedAt`, `totalScore = Σ COALESCE
   * (teacherScore, autoScore)`) + exactly one `graded` notification.
   * Non-`submitted` (incl. already `graded` — §16-Q4 settled by INV-TGRD-03)
   * → 409 ATTEMPT_NOT_SUBMITTED.
   */
  async grade(teacherId: string, attemptId: string, dto: GradeAttemptDto) {
    const attempt = await this.assertTeacherAttempt(teacherId, attemptId);
    if (attempt.status !== 'submitted') {
      throw new AppException(ErrorCode.ATTEMPT_NOT_SUBMITTED, 'Chỉ được chấm bài đã nộp');
    }

    const answers = await this.prisma.attemptAnswer.findMany({ where: { attemptId } });
    const owned = new Set(answers.map((a) => a.questionId));
    for (const g of dto.grades) {
      if (!owned.has(g.questionId)) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          `Câu hỏi ${g.questionId} không thuộc bài làm này`,
        );
      }
    }
    const gradeByQid = new Map(dto.grades.map((g) => [g.questionId, g]));

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      for (const a of answers) {
        const g = gradeByQid.get(a.questionId);
        // Missing answers keep their current values (04 §3.4).
        if (!g) continue;
        await tx.attemptAnswer.update({
          where: { id: a.id },
          data: {
            teacherScore: g.teacherScore,
            teacherFeedback: g.teacherFeedback ?? a.teacherFeedback,
          },
        });
      }
      const fresh = await tx.attemptAnswer.findMany({ where: { attemptId } });
      const totalScore = fresh.reduce(
        (sum, a) => sum + (a.teacherScore ?? a.autoScore ?? 0),
        0,
      );
      const graded = await tx.attempt.update({
        where: { id: attemptId },
        data: { status: 'graded', gradedAt: now, totalScore },
      });
      await tx.notification.create({
        data: {
          userId: attempt.studentId,
          type: NotificationType.graded,
          referenceId: attemptId,
          referenceType: 'attempt',
          payload: { attemptId, assignmentId: attempt.assignmentId },
        },
      });
      return graded;
    });

    return this.toDetailPayload({ ...attempt, ...result });
  }

  /**
   * INV-TGRD-06 (unparked 2026-09-12): Gemini suggestions for Writing answers.
   * Writes ONLY `aiSuggestedScore` + `aiFeedback` — never teacherScore,
   * teacherFeedback, autoScore, or attempt status. Requires `submitted`.
   * External calls never run inside the DB transaction (§7): all suggestions
   * resolve first, then the row writes commit together.
   */
  async suggest(teacherId: string, attemptId: string, questionIds?: string[]) {
    const attempt = await this.assertTeacherAttempt(teacherId, attemptId);
    if (attempt.status !== 'submitted') {
      throw new AppException(
        ErrorCode.ATTEMPT_NOT_SUBMITTED,
        'Chỉ gợi ý AI cho bài đã nộp',
      );
    }

    const [assignment, answers] = await Promise.all([
      this.prisma.assignment.findUniqueOrThrow({ where: { id: attempt.assignmentId } }),
      this.prisma.attemptAnswer.findMany({ where: { attemptId } }),
    ]);
    if (questionIds) {
      const owned = new Set(answers.map((a) => a.questionId));
      for (const qid of questionIds) {
        if (!owned.has(qid)) {
          throw new AppException(
            ErrorCode.VALIDATION_ERROR,
            `Câu hỏi ${qid} không thuộc bài làm này`,
          );
        }
      }
    }
    const questions = await this.questions
      .find({ _id: { $in: assignment.questionIds } })
      .lean();
    const skillById = new Map(
      questions.map((q) => [String(q._id), (q as { skill?: string }).skill ?? null]),
    );
    const contentById = new Map(
      questions.map((q) => [
        String(q._id),
        (q as { content?: { prompt?: string; rubric?: string } | null }).content ?? null,
      ]),
    );

    const targets = answers.filter((a) => {
      if (skillById.get(a.questionId) !== 'writing') {
        if (questionIds?.includes(a.questionId)) {
          throw new AppException(
            ErrorCode.VALIDATION_ERROR,
            `Câu hỏi ${a.questionId} không phải câu viết — gợi ý AI chỉ dùng cho writing`,
          );
        }
        return false;
      }
      if (questionIds && !questionIds.includes(a.questionId)) return false;
      // Nothing to score on a blank page — skipped silently, row untouched.
      return (a.writtenAnswer ?? '').trim().length > 0;
    });

    // Sequential: one teacher action, one gentle call chain — no burst against
    // the shared key, and a per-answer failure surface (§9 maps each branch).
    const suggestions = new Map<string, { score: number; feedback: string }>();
    for (const t of targets) {
      const content = contentById.get(t.questionId);
      suggestions.set(
        t.questionId,
        await this.aiSuggest.suggest({
          prompt: content?.prompt ?? null,
          rubric: content?.rubric ?? null,
          writtenAnswer: t.writtenAnswer as string,
        }),
      );
    }

    const updated = await this.prisma.$transaction(
      [...suggestions].map(([questionId, s]) =>
        this.prisma.attemptAnswer.update({
          where: { attemptId_questionId: { attemptId, questionId } },
          data: { aiSuggestedScore: s.score, aiFeedback: s.feedback },
        }),
      ),
    );
    return {
      answers: updated.map((a) => ({
        questionId: a.questionId,
        aiSuggestedScore: a.aiSuggestedScore,
        aiFeedback: a.aiFeedback,
      })),
    };
  }

  private async assertTeacherAttempt(teacherId: string, attemptId: string) {    if (!UUID_REGEX.test(attemptId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'attemptId không đúng định dạng uuid');
    }
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { assignment: { select: { id: true, teacherId: true, classId: true } } },
    });
    if (!attempt || attempt.assignment.teacherId !== teacherId) {
      throw new AppException(ErrorCode.ATTEMPT_NOT_FOUND, 'Không tìm thấy bài làm');
    }
    return attempt;
  }

  private async toDetailPayload(attempt: {
    id: string;
    assignmentId: string;
    studentId: string;
    status: string;
    startedAt: Date;
    submittedAt: Date | null;
    gradedAt: Date | null;
    totalScore: number | null;
    maxScore: number | null;
    isOfficialGrade: boolean;
  }) {
    const [assignment, answers, student] = await Promise.all([
      this.prisma.assignment.findUniqueOrThrow({ where: { id: attempt.assignmentId } }),
      this.prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } }),
      this.prisma.user.findUnique({
        where: { id: attempt.studentId },
        select: { id: true, nickname: true },
      }),
    ]);
    const questions = await this.questions
      .find({ _id: { $in: assignment.questionIds } })
      .lean();
    const byId = new Map(questions.map((q) => [String(q._id), q]));
    const answerByQid = new Map(answers.map((a) => [a.questionId, a]));

    return {
      attempt: {
        id: attempt.id,
        assignmentId: attempt.assignmentId,
        assignmentTitle: assignment.title,
        classId: assignment.classId,
        studentId: attempt.studentId,
        studentName: student?.nickname ?? null,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        gradedAt: attempt.gradedAt?.toISOString() ?? null,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        isOfficialGrade: attempt.isOfficialGrade,
      },
      answers: assignment.questionIds.map((qid) => {
        const q = byId.get(qid) as
          | {
              skill?: string;
              subType?: string;
              content?: { prompt?: string; rubric?: string } | null;
              options?: Array<{ id: string; text: string }>;
              correctAnswer?: unknown;
            }
          | undefined;
        const a = answerByQid.get(qid);
        return {
          questionId: qid,
          skill: q?.skill ?? null,
          subType: q?.subType ?? null,
          prompt: q?.content?.prompt ?? null,
          rubric: q?.content?.rubric ?? null,
          options: (q?.options ?? []).map((o) => ({ id: o.id, text: o.text })),
          correctAnswer: q?.correctAnswer ?? null,
          selectedOptions: a?.selectedOptions ?? [],
          writtenAnswer: a?.writtenAnswer ?? null,
          autoScore: a?.autoScore ?? null,
          teacherScore: a?.teacherScore ?? null,
          teacherFeedback: a?.teacherFeedback ?? null,
          aiSuggestedScore: a?.aiSuggestedScore ?? null,
          aiFeedback: a?.aiFeedback ?? null,
          isCorrect: a?.isCorrect ?? null,
        };
      }),
    };
  }
}
