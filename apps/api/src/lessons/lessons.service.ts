import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import type { CreateLessonDto } from './dto/create-lesson.dto';
import type { UpdateLessonDto } from './dto/update-lesson.dto';
import type { ReorderLessonItemDto } from './dto/reorder-lessons.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class LessonsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Helper: verify class exists and teacher is the owner.
   */
  private async assertClassOwner(classId: string, teacherId: string) {
    if (!UUID_REGEX.test(classId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'classId không đúng định dạng uuid');
    }
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new AppException(ErrorCode.CLASS_NOT_FOUND, 'Không tìm thấy lớp học');
    }
    if (cls.teacherId !== teacherId) {
      throw new AppException(
        ErrorCode.LESSON_ACCESS_DENIED,
        'Bạn không có quyền quản lý bài học của lớp này',
      );
    }
    return cls;
  }

  /**
   * Create a new lesson in a class.
   * Auto-assigns orderIndex = max + 1.
   */
  async create(classId: string, teacherId: string, dto: CreateLessonDto) {
    await this.assertClassOwner(classId, teacherId);

    const highest = await this.prisma.lesson.findFirst({
      where: { classId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const orderIndex = (highest?.orderIndex ?? 0) + 1;

    return this.prisma.lesson.create({
      data: {
        classId,
        teacherId,
        title: dto.title,
        description: dto.description ?? null,
        contentType: dto.contentType ?? 'text',
        contentUrl: dto.contentUrl ?? null,
        orderIndex,
      },
    });
  }

  /**
   * List lessons of a class, ordered by orderIndex ASC.
   */
  async findByClass(classId: string, teacherId: string) {
    await this.assertClassOwner(classId, teacherId);

    return this.prisma.lesson.findMany({
      where: { classId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  /**
   * Get single lesson detail.
   */
  async findById(id: string, teacherId: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!lesson) {
      throw new AppException(ErrorCode.LESSON_NOT_FOUND, 'Không tìm thấy bài học');
    }

    if (lesson.class.teacherId !== teacherId) {
      throw new AppException(
        ErrorCode.LESSON_ACCESS_DENIED,
        'Bạn không có quyền xem bài học này',
      );
    }

    return lesson;
  }

  /**
   * Update lesson.
   */
  async update(id: string, teacherId: string, dto: UpdateLessonDto) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!lesson) {
      throw new AppException(ErrorCode.LESSON_NOT_FOUND, 'Không tìm thấy bài học');
    }

    if (lesson.class.teacherId !== teacherId) {
      throw new AppException(
        ErrorCode.LESSON_ACCESS_DENIED,
        'Bạn không có quyền sửa bài học này',
      );
    }

    return this.prisma.lesson.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.contentType ? { contentType: dto.contentType } : {}),
        ...(dto.contentUrl !== undefined ? { contentUrl: dto.contentUrl } : {}),
      },
    });
  }

  /**
   * Delete lesson and re-index remaining lessons.
   */
  async delete(id: string, teacherId: string) {
    if (!UUID_REGEX.test(id)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!lesson) {
      throw new AppException(ErrorCode.LESSON_NOT_FOUND, 'Không tìm thấy bài học');
    }

    if (lesson.class.teacherId !== teacherId) {
      throw new AppException(
        ErrorCode.LESSON_ACCESS_DENIED,
        'Bạn không có quyền xóa bài học này',
      );
    }

    await this.prisma.lesson.delete({ where: { id } });

    // Pack remaining order indices
    const remaining = await this.prisma.lesson.findMany({
      where: { classId: lesson.classId },
      orderBy: { orderIndex: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].orderIndex !== i + 1) {
        await this.prisma.lesson.update({
          where: { id: remaining[i].id },
          data: { orderIndex: i + 1 },
        });
      }
    }

    return { message: 'Đã xóa bài học thành công' };
  }

  /**
   * Reorder lessons within a class transactionally.
   */
  async reorder(classId: string, teacherId: string, items: ReorderLessonItemDto[]) {
    await this.assertClassOwner(classId, teacherId);

    // Verify all items belong to this class
    const lessons = await this.prisma.lesson.findMany({
      where: { classId },
      select: { id: true },
    });
    const validIds = new Set(lessons.map((l) => l.id));

    for (const item of items) {
      if (!validIds.has(item.id)) {
        throw new AppException(
          ErrorCode.LESSON_NOT_FOUND,
          `Bài học ${item.id} không thuộc lớp này`,
        );
      }
    }

    // Two-step transactional update to avoid unique(classId, orderIndex) collision
    await this.prisma.$transaction(async (tx) => {
      // Step 1: Temporarily shift orderIndex by +10000
      for (const item of items) {
        await tx.lesson.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex + 10000 },
        });
      }
      // Step 2: Set target orderIndex
      for (const item of items) {
        await tx.lesson.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        });
      }
    });

    return this.prisma.lesson.findMany({
      where: { classId },
      orderBy: { orderIndex: 'asc' },
    });
  }
}
