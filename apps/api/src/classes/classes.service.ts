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
