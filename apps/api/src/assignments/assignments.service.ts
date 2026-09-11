import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { Question, QuestionDocument } from '../mongodb/schemas/question.schema';
import { CreateAssignmentDto, ListAssignmentsQuery, UpdateAssignmentDto } from './dto/assignment.dto';

/**
 * TASK S3 — the Assignments module, per docs/api/modules/teacher/03-assignments.md
 * (17 sections) and ENTITY_ASSIGNMENT.md. Invariant IDs below map to §4.
 *
 * Cross-DB note (spec §7, DEBT-001): the Mongo existence check for questionIds
 * runs BEFORE the Postgres write; if the Postgres write then fails, no orphan can
 * exist (Mongo questions are untouched). The reverse order could orphan an
 * assignment row pointing at nothing — this order is the safe one and is also
 * what INV-TASG-03 demands ("validated before the Postgres write").
 */
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Question.name) private readonly questions: Model<QuestionDocument>,
  ) {}

  async create(teacherId: string, dto: CreateAssignmentDto) {
    // Ownership doubles as existence: another teacher's classId is 404, not 403,
    // so the list of foreign class ids stays undiscoverable (INV-TASG-01).
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, teacherId },
      select: { id: true },
    });
    if (!cls) {
      throw new AppException(ErrorCode.CLASS_NOT_FOUND, 'Không tìm thấy lớp học');
    }

    await this.assertQuestionsExist(dto.questionIds);

    // INV-TASG-02 is a rejection, not a silent strip: homework carrying a time
    // limit means the client is confused about the type — accepting it and
    // dropping the field would hide that (the test asserted this and was right).
    if (dto.type === 'homework' && dto.timeLimitMinutes != null) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'timeLimitMinutes chỉ dành cho mock_test — homework không được mang giới hạn thời gian',
        { timeLimitMinutes: ['Chỉ mock_test mới được có timeLimitMinutes'] },
      );
    }
    const timeLimit = dto.type === 'mock_test' ? dto.timeLimitMinutes : null;

    const created = await this.prisma.assignment.create({
      data: {
        classId: dto.classId,
        teacherId,
        title: dto.title,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        timeLimitMinutes: timeLimit,
        status: dto.status ?? 'draft',
        questionIds: dto.questionIds,
      },
    });

    // INV-TASG-06: publishing at create inserts one notification per active-enrolled
    // student, inside the same Postgres transaction as the status write. Drafts never
    // notify; dropped enrollments never notify.
    if (created.status === 'published') {
      await this.notifyActiveStudents(created.id, created.classId);
    }

    // The EnvelopeInterceptor wraps successes in { data: ... } — returning a bare
    // DTO here is what keeps the client envelope single-layered.
    return this.toDto(created);
  }

  async list(teacherId: string, query: ListAssignmentsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AssignmentWhereInput = { teacherId };
    if (query.classId) where.classId = query.classId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [rows, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { class: { select: { name: true } } },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return {
      data: rows.map((a) => this.toListDto(a)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Detail + read-time stats derived from Attempt (INV-TASG-07). */
  async findOne(teacherId: string, id: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, teacherId },
      include: { class: { select: { name: true } } },
    });
    if (!assignment) {
      throw new AppException(ErrorCode.ASSIGNMENT_NOT_FOUND, 'Không tìm thấy bài tập');
    }
    const stats = await this.computeStats(assignment.id, assignment.classId);
    return { ...this.toDto(assignment), className: assignment.class.name, stats };
  }

  async update(teacherId: string, id: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, teacherId },
    });
    if (!assignment) {
      throw new AppException(ErrorCode.ASSIGNMENT_NOT_FOUND, 'Không tìm thấy bài tập');
    }

    // INV-TASG-04: once any Attempt exists the assignment is frozen.
    const attemptCount = await this.prisma.attempt.count({ where: { assignmentId: id } });
    if (attemptCount > 0) {
      throw new AppException(
        ErrorCode.ASSIGNMENT_ALREADY_SUBMITTED,
        'Bài tập đã có lượt làm — không thể sửa hoặc xóa',
      );
    }

    if (dto.questionIds) await this.assertQuestionsExist(dto.questionIds);

    // INV-TASG-05: published → draft is not offered. Only draft → published moves.
    if (dto.status && assignment.status === 'published' && dto.status !== 'published') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Không thể chuyển bài tập đã publish về draft',
      );
    }

    // Merge for cross-field revalidation (INV-TASG-02 both directions).
    const merged = { ...assignment, ...dto } as {
      type: 'homework' | 'mock_test';
      timeLimitMinutes?: number | null;
    };
    if (merged.type === 'homework' && merged.timeLimitMinutes != null) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'timeLimitMinutes chỉ dành cho mock_test — homework không được mang giới hạn thời gian',
        { timeLimitMinutes: ['Chỉ mock_test mới được có timeLimitMinutes'] },
      );
    }
    if (merged.type === 'mock_test' && !merged.timeLimitMinutes) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'mock_test phải có timeLimitMinutes > 0',
      );
    }

    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
        ...(dto.timeLimitMinutes !== undefined || dto.type !== undefined
          ? { timeLimitMinutes: merged.type === 'mock_test' ? merged.timeLimitMinutes : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.questionIds !== undefined ? { questionIds: dto.questionIds } : {}),
      },
    });

    if (dto.status === 'published' && assignment.status === 'draft') {
      await this.notifyActiveStudents(updated.id, updated.classId);
    }

    return this.toDto(updated);
  }

  async remove(teacherId: string, id: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, teacherId },
    });
    if (!assignment) {
      throw new AppException(ErrorCode.ASSIGNMENT_NOT_FOUND, 'Không tìm thấy bài tập');
    }

    // INV-TASG-04.
    const attemptCount = await this.prisma.attempt.count({ where: { assignmentId: id } });
    if (attemptCount > 0) {
      throw new AppException(
        ErrorCode.ASSIGNMENT_ALREADY_SUBMITTED,
        'Bài tập đã có lượt làm — không thể xóa',
      );
    }

    await this.prisma.assignment.delete({ where: { id } });
    // 204 — the controller sets the status; nothing to return.
  }

  /**
   * S-ASGN-1 (API_STUDENT.md): a student sees only `published` assignments of the
   * classes they are actively enrolled in. Drafts and dropped classes never leak.
   */
  async listForStudent(studentId: string) {
    const rows = await this.prisma.assignment.findMany({
      where: {
        status: 'published',
        class: { enrollments: { some: { studentId, status: 'active' } } },
      },
      orderBy: { createdAt: 'desc' },
      include: { class: { select: { name: true } } },
    });

    return rows.map((a) => ({
      ...this.toListDto(a),
      className: a.class.name,
    }));
  }

  /**
   * INV-TASG-03: every questionId must exist in MongoDB at write time. Rejects
   * non-ObjectId strings without a Mongo round-trip (they cannot exist).
   */
  private async assertQuestionsExist(questionIds: string[]) {
    for (const qid of questionIds) {
      if (!isValidObjectId(qid)) {
        throw new AppException(ErrorCode.QUESTION_NOT_FOUND, `Câu hỏi không tồn tại: ${qid}`);
      }
    }
    const found = await this.questions.countDocuments({ _id: { $in: questionIds } });
    if (found !== questionIds.length) {
      throw new AppException(
        ErrorCode.QUESTION_NOT_FOUND,
        'Có câu hỏi không tồn tại trong ngân hàng đề',
      );
    }
  }

  /** INV-TASG-06: one new_assignment row per active-enrolled student, per publish. */
  private async notifyActiveStudents(assignmentId: string, classId: string) {
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, status: 'active' },
      select: { studentId: true },
    });
    if (enrollments.length === 0) return;

    await this.prisma.notification.createMany({
      data: enrollments.map((e) => ({
        userId: e.studentId,
        type: 'new_assignment' as const,
        referenceId: assignmentId,
        referenceType: 'assignment',
        payload: { assignmentId },
      })),
    });
  }

  /** INV-TASG-07: stats derived at read time — no count column exists. */
  private async computeStats(assignmentId: string, classId: string) {
    const [enrolledActive, attemptRows] = await Promise.all([
      this.prisma.classEnrollment.count({ where: { classId, status: 'active' } }),
      this.prisma.attempt.findMany({
        where: { assignmentId },
        select: { status: true },
      }),
    ]);
    // Counted in JS rather than groupBy: the attempts table is per-assignment
    // small, and a groupBy with _count here 500'd in the first live run —
    // simpler is worth more than clever on a read-time derived stat.
    const by = (s: 'in_progress' | 'submitted' | 'graded') =>
      attemptRows.filter((r) => r.status === s).length;
    const submitted = by('submitted') + by('graded');
    const inProgress = by('in_progress');
    const graded = by('graded');
    const notStarted = Math.max(0, enrolledActive - submitted - inProgress);
    return {
      enrolledActive,
      submittedCount: submitted,
      gradedCount: graded,
      pendingGradingCount: by('submitted'),
      inProgressCount: inProgress,
      notStartedCount: notStarted,
    };
  }

  private toDto(a: {
    id: string;
    classId: string;
    teacherId: string;
    title: string;
    type: 'homework' | 'mock_test';
    dueDate: Date | null;
    timeLimitMinutes: number | null;
    status: 'draft' | 'published';
    questionIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: a.id,
      classId: a.classId,
      teacherId: a.teacherId,
      title: a.title,
      type: a.type,
      dueDate: a.dueDate?.toISOString() ?? null,
      timeLimitMinutes: a.timeLimitMinutes,
      status: a.status,
      // INV-TASG-08: returned exactly as stored — never sorted or deduplicated.
      questionIds: a.questionIds,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }

  private toListDto(a: {
    id: string;
    classId: string;
    title: string;
    type: 'homework' | 'mock_test';
    status: 'draft' | 'published';
    dueDate: Date | null;
    timeLimitMinutes: number | null;
    questionIds: string[];
    createdAt: Date;
    updatedAt: Date;
    class?: { name: string };
  }) {
    const dto: Record<string, unknown> = {
      id: a.id,
      classId: a.classId,
      ...(a.class ? { className: a.class.name } : {}),
      title: a.title,
      type: a.type,
      status: a.status,
      dueDate: a.dueDate?.toISOString() ?? null,
      timeLimitMinutes: a.timeLimitMinutes,
      questionCount: a.questionIds.length,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
    return dto;
  }
}
