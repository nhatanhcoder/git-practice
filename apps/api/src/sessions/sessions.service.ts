import { Inject, Injectable } from '@nestjs/common';
import { Prisma, SessionStatus, NotificationType, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PendingSessionsQuery, SessionSort } from './dto/pending-sessions.query';
import { RejectSessionDto } from './dto/reject-session.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PendingSessionItem = {
  id: string;
  classId: string;
  className: string;
  hskLevel: number;
  teacherId: string;
  teacherName: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  topic: string;
  notes: string | null;
  status: string;
  attendanceSummary: {
    present: number;
    absentExcused: number;
    absentUnexcused: number;
    marked: number;
    enrolledActive: number;
  };
  updatedAt: string;
};

export type PendingSessionsResult = {
  data: PendingSessionItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

@Injectable()
export class SessionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // ADMIN METHODS (Module 04)
  // --------------------------------------------------------------------------

  async listPending(query: PendingSessionsQuery): Promise<PendingSessionsResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ClassSessionWhereInput = {
      status: SessionStatus.completed_pending,
    };

    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.classId) where.classId = query.classId;
    if (query.dateFrom || query.dateTo) {
      where.scheduledDate = {};
      if (query.dateFrom) where.scheduledDate.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
      if (query.dateTo) where.scheduledDate.lte = new Date(`${query.dateTo}T00:00:00.000Z`);
    }

    const orderBy: Prisma.ClassSessionOrderByWithRelationInput =
      query.sort === SessionSort.scheduledDate_desc
        ? { scheduledDate: 'desc' }
        : { scheduledDate: 'asc' };

    const [total, sessions] = await this.prisma.$transaction([
      this.prisma.classSession.count({ where }),
      this.prisma.classSession.findMany({
        where,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              hskLevel: true,
              _count: {
                select: {
                  enrollments: { where: { status: 'active' } },
                },
              },
            },
          },
          teacher: {
            select: {
              id: true,
              nickname: true,
            },
          },
          attendances: {
            select: {
              status: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data: PendingSessionItem[] = sessions.map((s) => {
      let present = 0;
      let absentExcused = 0;
      let absentUnexcused = 0;

      for (const a of s.attendances) {
        if (a.status === AttendanceStatus.present) present++;
        else if (a.status === AttendanceStatus.absent_excused) absentExcused++;
        else if (a.status === AttendanceStatus.absent_unexcused) absentUnexcused++;
      }

      const marked = present + absentExcused + absentUnexcused;
      const enrolledActive = s.class._count.enrollments;

      return {
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        hskLevel: s.class.hskLevel,
        teacherId: s.teacherId,
        teacherName: s.teacher.nickname ?? 'Giáo viên',
        scheduledDate: s.scheduledDate.toISOString().slice(0, 10),
        scheduledStart: s.scheduledStart,
        scheduledEnd: s.scheduledEnd,
        actualStart: s.actualStart?.toISOString() ?? null,
        actualEnd: s.actualEnd?.toISOString() ?? null,
        topic: s.topic,
        notes: s.notes,
        status: s.status,
        attendanceSummary: {
          present,
          absentExcused,
          absentUnexcused,
          marked,
          enrolledActive,
        },
        updatedAt: s.updatedAt.toISOString(),
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approve(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    const session = await this.prisma.classSession.findUnique({ where: { id } });
    if (!session) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    if (session.status !== SessionStatus.completed_pending) {
      throw new AppException(
        ErrorCode.SESSION_ALREADY_REVIEWED,
        'Buổi học không ở trạng thái chờ duyệt hoặc đã được xử lý',
      );
    }

    // Atomic update + notification in one transaction (INV-SESSION-07, 08)
    const [updated] = await this.prisma.$transaction([
      this.prisma.classSession.update({
        where: {
          id,
          status: SessionStatus.completed_pending,
        },
        data: {
          status: SessionStatus.approved,
          rejectionReason: null,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: session.teacherId,
          type: NotificationType.session_approved,
          referenceId: session.id,
          referenceType: 'session',
          payload: {
            topic: session.topic,
            scheduledDate: session.scheduledDate.toISOString().slice(0, 10),
          },
        },
      }),
    ]);

    return {
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async reject(id: string, dto: RejectSessionDto) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    const session = await this.prisma.classSession.findUnique({ where: { id } });
    if (!session) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    if (session.status !== SessionStatus.completed_pending) {
      throw new AppException(
        ErrorCode.SESSION_ALREADY_REVIEWED,
        'Buổi học không ở trạng thái chờ duyệt hoặc đã được xử lý',
      );
    }

    const rejectionReason = dto.rejectionReason.trim();
    if (!rejectionReason) {
      throw new AppException(
        ErrorCode.SESSION_REJECT_REASON_REQUIRED,
        'Lý do từ chối không được để trống',
      );
    }

    // Atomic update + notification in one transaction (INV-SESSION-07, 09)
    const [updated] = await this.prisma.$transaction([
      this.prisma.classSession.update({
        where: {
          id,
          status: SessionStatus.completed_pending,
        },
        data: {
          status: SessionStatus.rejected,
          rejectionReason,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: session.teacherId,
          type: NotificationType.session_rejected,
          referenceId: session.id,
          referenceType: 'session',
          payload: {
            topic: session.topic,
            rejectionReason,
            scheduledDate: session.scheduledDate.toISOString().slice(0, 10),
          },
        },
      }),
    ]);

    return {
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // TEACHER METHODS (GATE 3 / API-004)
  // --------------------------------------------------------------------------

  async teacherCreateSession(teacherId: string, dto: CreateSessionDto) {
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, teacherId },
    });
    if (!cls) {
      throw new AppException(ErrorCode.CLASS_ACCESS_DENIED, 'Bạn không phụ trách lớp học này');
    }

    return this.prisma.classSession.create({
      data: {
        classId: dto.classId,
        teacherId,
        scheduledDate: new Date(`${dto.scheduledDate}T00:00:00.000Z`),
        scheduledStart: dto.scheduledStart,
        scheduledEnd: dto.scheduledEnd,
        topic: dto.topic,
        notes: dto.notes ?? null,
        status: SessionStatus.scheduled,
      },
    });
  }

  async teacherStartSession(teacherId: string, id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    const session = await this.prisma.classSession.findUnique({ where: { id } });
    if (!session || session.teacherId !== teacherId) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    if (session.status !== SessionStatus.scheduled) {
      throw new AppException(
        ErrorCode.SESSION_INVALID_TRANSITION,
        'Chỉ buổi học đã lên lịch mới có thể bắt đầu',
      );
    }

    return this.prisma.classSession.update({
      where: { id },
      data: {
        status: SessionStatus.in_progress,
        actualStart: new Date(),
      },
    });
  }

  async teacherEndSession(teacherId: string, id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    const session = await this.prisma.classSession.findUnique({ where: { id } });
    if (!session || session.teacherId !== teacherId) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    if (session.status !== SessionStatus.in_progress) {
      throw new AppException(
        ErrorCode.SESSION_INVALID_TRANSITION,
        'Buổi học chưa được bắt đầu hoặc đã hoàn tất',
      );
    }

    const now = new Date();
    if (session.actualStart && now <= session.actualStart) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Thời gian kết thúc thực tế phải sau thời gian bắt đầu',
      );
    }

    return this.prisma.classSession.update({
      where: { id },
      data: {
        actualEnd: now,
      },
    });
  }

  async teacherSubmitSession(teacherId: string, id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: { attendances: true },
    });
    if (!session || session.teacherId !== teacherId) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    if (session.status !== SessionStatus.in_progress) {
      throw new AppException(
        ErrorCode.SESSION_INVALID_TRANSITION,
        'Chỉ buổi học đang diễn ra mới có thể nộp phê duyệt',
      );
    }

    // INV-SESSION-13 / Q-SES-3: Must have actualEnd before submitting
    if (!session.actualEnd) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Cần kết thúc buổi học (actualEnd) trước khi nộp phê duyệt',
      );
    }

    // Must have recorded attendances
    if (session.attendances.length === 0) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Cần điểm danh học viên trước khi nộp phê duyệt',
      );
    }

    // Find all admins to fan out notification
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', status: 'active' },
      select: { id: true },
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.classSession.update({
        where: { id },
        data: {
          status: SessionStatus.completed_pending,
        },
      }),
      this.prisma.notification.createMany({
        data: admins.map((adm) => ({
          userId: adm.id,
          type: NotificationType.session_submitted_for_review,
          referenceId: session.id,
          referenceType: 'session',
          payload: {
            sessionId: session.id,
            teacherId,
            topic: session.topic,
          },
        })),
      }),
    ]);

    return updated;
  }

  async teacherMarkAttendance(teacherId: string, sessionId: string, dto: MarkAttendanceDto) {
    if (!UUID_REGEX.test(sessionId)) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: { include: { enrollments: true } } },
    });

    if (!session || session.teacherId !== teacherId) {
      throw new AppException(ErrorCode.SESSION_NOT_FOUND, 'Buổi học không tồn tại');
    }

    if (session.status === SessionStatus.approved) {
      throw new AppException(
        ErrorCode.SESSION_ALREADY_REVIEWED,
        'Buổi học đã được duyệt, không thể sửa điểm danh',
      );
    }

    // Upsert attendances
    for (const rec of dto.records) {
      await this.prisma.sessionAttendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: rec.studentId,
          },
        },
        update: {
          status: rec.status,
        },
        create: {
          sessionId,
          studentId: rec.studentId,
          status: rec.status,
        },
      });
    }

    return { success: true, count: dto.records.length };
  }
}
