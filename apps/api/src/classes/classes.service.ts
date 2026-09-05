import { Inject, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import type { CreateClassDto } from './dto/create-class.dto';
import type { UpdateClassDto } from './dto/update-class.dto';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateEnrollmentCode(): string {
  let result = '';
  for (let i = 0; i < 8; i++) {
    const idx = crypto.randomInt(0, CODE_CHARS.length);
    result += CODE_CHARS[idx];
  }
  return result;
}

@Injectable()
export class ClassesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Create a new class for a teacher.
   * Auto-generates unique 8-char enrollmentCode with retry on collision.
   */
  async create(teacherId: string, dto: CreateClassDto) {
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const code = generateEnrollmentCode();
      try {
        const cls = await this.prisma.class.create({
          data: {
            teacherId,
            name: dto.name,
            hskLevel: dto.hskLevel,
            enrollmentCode: code,
            description: dto.description ?? null,
            status: 'active',
          },
        });
        return cls;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempts < 5
        ) {
          continue; // retry with a new code
        }
        throw err;
      }
    }
    throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, 'Không thể sinh mã ghi danh duy nhất');
  }

  /**
   * List all classes owned by teacher.
   */
  async findMyClasses(teacherId: string) {
    const classes = await this.prisma.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            enrollments: { where: { status: 'active' } },
            lessons: true,
          },
        },
      },
    });

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      hskLevel: c.hskLevel,
      enrollmentCode: c.enrollmentCode,
      status: c.status,
      description: c.description,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      studentCount: c._count.enrollments,
      lessonCount: c._count.lessons,
    }));
  }

  /**
   * Get class detail with enrolled students.
   * Enforces teacher ownership unless called by admin.
   */
  async findById(classId: string, teacherId?: string, isAdmin = false) {
    if (!UUID_REGEX.test(classId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'classId không đúng định dạng uuid');
    }

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: { id: true, nickname: true, email: true, avatarUrl: true },
        },
        enrollments: {
          where: { status: 'active' },
          include: {
            student: {
              select: { id: true, nickname: true, email: true, avatarUrl: true },
            },
          },
        },
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            contentType: true,
            orderIndex: true,
            createdAt: true,
          },
        },
      },
    });

    if (!cls) {
      throw new AppException(ErrorCode.CLASS_NOT_FOUND, 'Không tìm thấy lớp học');
    }

    // Fail closed. The previous condition was `!isAdmin && teacherId && ...`, so calling
    // this without a teacherId and without isAdmin skipped the ownership check entirely
    // and returned any class, roster included. Both current callers happen to pass one or
    // the other, but a default that means "no check" is the wrong way round for the one
    // place ownership is enforced — RBAC lives in the service layer, not the role guard.
    if (!isAdmin) {
      if (!teacherId || cls.teacherId !== teacherId) {
        throw new AppException(
          ErrorCode.CLASS_ACCESS_DENIED,
          'Bạn không phải là giáo viên của lớp học này',
        );
      }
    }

    return {
      id: cls.id,
      name: cls.name,
      hskLevel: cls.hskLevel,
      enrollmentCode: cls.enrollmentCode,
      status: cls.status,
      description: cls.description,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
      teacher: cls.teacher,
      students: cls.enrollments.map((e) => ({
        id: e.student.id,
        nickname: e.student.nickname,
        email: e.student.email,
        avatarUrl: e.student.avatarUrl,
        joinedAt: e.joinedAt,
      })),
      lessons: cls.lessons,
    };
  }

  /**
   * Update class info.
   */
  async update(classId: string, teacherId: string, dto: UpdateClassDto) {
    if (!UUID_REGEX.test(classId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'classId không đúng định dạng uuid');
    }

    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new AppException(ErrorCode.CLASS_NOT_FOUND, 'Không tìm thấy lớp học');
    }

    if (cls.teacherId !== teacherId) {
      throw new AppException(ErrorCode.CLASS_ACCESS_DENIED, 'Bạn không phải là giáo viên của lớp học này');
    }

    if (cls.status === 'archived') {
      throw new AppException(ErrorCode.CLASS_ALREADY_ARCHIVED, 'Lớp học đã được lưu trữ, không thể chỉnh sửa');
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.hskLevel ? { hskLevel: dto.hskLevel } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  /**
   * Archive a class.
   */
  async archive(classId: string, teacherId: string) {
    if (!UUID_REGEX.test(classId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'classId không đúng định dạng uuid');
    }

    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new AppException(ErrorCode.CLASS_NOT_FOUND, 'Không tìm thấy lớp học');
    }

    if (cls.teacherId !== teacherId) {
      throw new AppException(ErrorCode.CLASS_ACCESS_DENIED, 'Bạn không phải là giáo viên của lớp học này');
    }

    if (cls.status === 'archived') {
      throw new AppException(ErrorCode.CLASS_ALREADY_ARCHIVED, 'Lớp học đã ở trạng thái lưu trữ');
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: { status: 'archived' },
    });
  }

  /**
   * Regenerate 8-char enrollment code.
   */
  async regenerateCode(classId: string, teacherId: string) {
    if (!UUID_REGEX.test(classId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'classId không đúng định dạng uuid');
    }

    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new AppException(ErrorCode.CLASS_NOT_FOUND, 'Không tìm thấy lớp học');
    }

    if (cls.teacherId !== teacherId) {
      throw new AppException(ErrorCode.CLASS_ACCESS_DENIED, 'Bạn không phải là giáo viên của lớp học này');
    }

    if (cls.status === 'archived') {
      throw new AppException(ErrorCode.CLASS_ALREADY_ARCHIVED, 'Lớp học đã được lưu trữ, không thể tạo lại mã');
    }

    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const newCode = generateEnrollmentCode();
      try {
        const updated = await this.prisma.class.update({
          where: { id: classId },
          data: { enrollmentCode: newCode },
        });
        return { enrollmentCode: updated.enrollmentCode };
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempts < 5
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, 'Không thể sinh mã ghi danh duy nhất');
  }

  /**
   * Student joins a class using its 8-character enrollment code - F2.3.
   *
   * Re-join policy (owner decision 2026-09-05, closing the open question in
   * docs/api/modules/03-classes-enrollment.md section 16): a student who previously left
   * REACTIVATES the existing row rather than being blocked. Blocking was the alternative and
   * was rejected because it leaves a student who mis-clicked "leave" permanently stuck -
   * there is no re-admit endpoint for a teacher or admin anywhere in API_TEACHER.md or
   * API_ADMIN.md, so it would be the same defect class as API-003.
   *
   * UNIQUE(classId, studentId) makes "insert a second row" impossible, so reactivation is
   * the only shape available; joinedAt is preserved and rejoinedAt records the return.
   */
  async joinByCode(studentId: string, enrollmentCode: string) {
    const cls = await this.prisma.class.findUnique({
      where: { enrollmentCode },
    });

    if (!cls) {
      throw new AppException(ErrorCode.CLASS_ENROLL_CODE_INVALID, 'Mã ghi danh không tồn tại');
    }

    // INV-CLASS-02 - only an active class can be enrolled into.
    if (cls.status === 'archived') {
      throw new AppException(
        ErrorCode.CLASS_ALREADY_ARCHIVED,
        'Lớp học đã được lưu trữ, không thể ghi danh',
      );
    }

    const existing = await this.prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId: cls.id, studentId } },
    });

    if (existing) {
      if (existing.status === 'active') {
        throw new AppException(ErrorCode.CLASS_ALREADY_ENROLLED, 'Bạn đã ở trong lớp học này');
      }

      // Conditional update, not a plain update: two concurrent re-joins would both read
      // status = dropped above. Making 'dropped' part of the WHERE means exactly one of them
      // changes a row; the loser sees count 0 and is told it is already enrolled, which is
      // true by then. Reading-then-writing without this condition would let both "succeed"
      // and the second would silently overwrite the first one's rejoinedAt.
      const reactivated = await this.prisma.classEnrollment.updateMany({
        where: { id: existing.id, status: 'dropped' },
        data: { status: 'active', rejoinedAt: new Date() },
      });

      if (reactivated.count === 0) {
        throw new AppException(ErrorCode.CLASS_ALREADY_ENROLLED, 'Bạn đã ở trong lớp học này');
      }

      const row = await this.prisma.classEnrollment.findUniqueOrThrow({
        where: { id: existing.id },
      });
      return this.toEnrollmentResult(cls, row);
    }

    try {
      const row = await this.prisma.classEnrollment.create({
        data: { classId: cls.id, studentId, status: 'active' },
      });
      return this.toEnrollmentResult(cls, row);
    } catch (err) {
      // INV-CLASS-05 - the unique constraint is the last line of defence, not the check
      // above: two first-time joins racing both find no row and both reach this create.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException(ErrorCode.CLASS_ALREADY_ENROLLED, 'Bạn đã ở trong lớp học này');
      }
      throw err;
    }
  }

  /**
   * Student leaves a class - F2.4.
   * INV-CLASS-06: this is a status change to `dropped`, never a delete. The row and its
   * joinedAt survive so the enrollment history stays readable.
   */
  async leave(studentId: string, classId: string) {
    if (!UUID_REGEX.test(classId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'classId không đúng định dạng uuid');
    }

    // Conditional on status for the same reason as the re-join path: two concurrent leave
    // requests must not both report success.
    const dropped = await this.prisma.classEnrollment.updateMany({
      where: { classId, studentId, status: 'active' },
      data: { status: 'dropped' },
    });

    if (dropped.count === 0) {
      throw new AppException(ErrorCode.CLASS_NOT_ENROLLED, 'Bạn không ở trong lớp học này');
    }

    const row = await this.prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });

    return {
      classId,
      status: row?.status ?? 'dropped',
      joinedAt: row?.joinedAt ?? null,
      rejoinedAt: row?.rejoinedAt ?? null,
    };
  }

  /**
   * List the classes a student is currently enrolled in - F2.6.
   * Only `active` enrollments; a dropped class is history, not a current class.
   */
  async findMyEnrolledClasses(studentId: string) {
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { studentId, status: 'active' },
      orderBy: { joinedAt: 'desc' },
      include: {
        class: {
          include: {
            teacher: { select: { id: true, nickname: true, email: true, avatarUrl: true } },
            _count: { select: { enrollments: { where: { status: 'active' } }, lessons: true } },
          },
        },
      },
    });

    return enrollments.map((e) => ({
      id: e.class.id,
      name: e.class.name,
      hskLevel: e.class.hskLevel,
      status: e.class.status,
      description: e.class.description,
      teacher: e.class.teacher,
      studentCount: e.class._count.enrollments,
      lessonCount: e.class._count.lessons,
      joinedAt: e.joinedAt,
      rejoinedAt: e.rejoinedAt,
      // enrollmentCode is deliberately absent: it is the class invite credential, and
      // API_STUDENT.md never lists it on a student-facing payload. Returning it would let
      // any enrolled student hand out access to a class they do not own.
    }));
  }

  /**
   * Class detail for an enrolled student - F2.6.
   * INV-CLASS-07: content is readable only while the enrollment is `active`.
   */
  async findEnrolledClassDetail(studentId: string, classId: string) {
    if (!UUID_REGEX.test(classId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'classId không đúng định dạng uuid');
    }

    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });

    // Ownership is enforced here in the service, not by @Roles('student') on the controller -
    // the guard only proves the caller is *a* student, never that this class is theirs.
    if (!enrollment || enrollment.status !== 'active') {
      throw new AppException(ErrorCode.CLASS_ACCESS_DENIED, 'Bạn không có quyền xem lớp học này');
    }

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { id: true, nickname: true, email: true, avatarUrl: true } },
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            contentType: true,
            contentUrl: true,
            orderIndex: true,
            createdAt: true,
          },
        },
        _count: { select: { enrollments: { where: { status: 'active' } } } },
      },
    });

    if (!cls) {
      throw new AppException(ErrorCode.CLASS_NOT_FOUND, 'Không tìm thấy lớp học');
    }

    return {
      id: cls.id,
      name: cls.name,
      hskLevel: cls.hskLevel,
      status: cls.status,
      description: cls.description,
      createdAt: cls.createdAt,
      teacher: cls.teacher,
      lessons: cls.lessons,
      studentCount: cls._count.enrollments,
      joinedAt: enrollment.joinedAt,
      rejoinedAt: enrollment.rejoinedAt,
      // No student roster: RBAC_MATRIX gives the roster to the teacher who owns the class and
      // to Admin as read-only audit, never to a peer student.
    };
  }

  private toEnrollmentResult(
    cls: { id: string; name: string; hskLevel: number },
    row: { status: string; joinedAt: Date; rejoinedAt: Date | null },
  ) {
    return {
      classId: cls.id,
      name: cls.name,
      hskLevel: cls.hskLevel,
      enrollmentStatus: row.status,
      joinedAt: row.joinedAt,
      rejoinedAt: row.rejoinedAt,
    };
  }

  /**
   * Admin list all classes across the platform.
   */
  async adminListAll() {
    const classes = await this.prisma.class.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, nickname: true, email: true } },
        _count: {
          select: {
            enrollments: { where: { status: 'active' } },
            lessons: true,
          },
        },
      },
    });

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      hskLevel: c.hskLevel,
      enrollmentCode: c.enrollmentCode,
      status: c.status,
      createdAt: c.createdAt,
      teacher: c.teacher,
      studentCount: c._count.enrollments,
      lessonCount: c._count.lessons,
    }));
  }
}
