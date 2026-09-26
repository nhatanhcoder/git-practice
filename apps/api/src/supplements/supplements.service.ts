import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { GrammarService } from '../grammar/grammar.service';
import { LearningCatalogService } from '../learning-catalog/learning-catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AttachSupplementDto } from './dto/attach-supplement.dto';
import type { ReorderSupplementItemDto } from './dto/reorder-supplements.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SupplementSourceType = 'learning_unit' | 'grammar_point';

export interface SupplementItem {
  id: string;
  sourceType: SupplementSourceType;
  sourceKey: string;
  orderIndex: number;
  /** Null when the source is currently unresolvable — never leaked content. */
  title: string | null;
  available: boolean;
}

/**
 * Lesson↔catalog links (API-020, teacher/08-supplements.md). A link is metadata
 * only: it never copies content and never writes progress. Ownership always flows
 * through `lesson.class.teacherId` (INV-TCL-06 pattern); student reads additionally
 * require an active enrollment, enforced by the calling service.
 */
@Injectable()
export class SupplementsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LearningCatalogService) private readonly catalog: LearningCatalogService,
    @Inject(GrammarService) private readonly grammar: GrammarService,
  ) {}

  /**
   * Teacher write gate: the lesson JOIN its class must belong to the caller.
   */
  async loadOwnedLesson(lessonId: string, teacherId: string) {
    if (!UUID_REGEX.test(lessonId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { class: true },
    });
    if (!lesson) {
      throw new AppException(ErrorCode.LESSON_NOT_FOUND, 'Không tìm thấy bài học');
    }
    if (lesson.class.teacherId !== teacherId) {
      throw new AppException(
        ErrorCode.LESSON_ACCESS_DENIED,
        'Bạn không có quyền quản lý bài học của lớp này',
      );
    }
    return lesson;
  }

  /**
   * Attach a source. Order is server-assigned (`MAX + 1`); the client never sends it.
   */
  async attach(lessonId: string, teacherId: string, dto: AttachSupplementDto) {
    await this.loadOwnedLesson(lessonId, teacherId);
    const title = await this.resolveSourceTitle(dto.sourceType, dto.sourceKey);

    // Bounded retry: a concurrent attach of a DIFFERENT source can win the same
    // orderIndex (UNIQUE(lessonId, orderIndex)); recompute MAX and go again. A
    // concurrent attach of the SAME source surfaces on the re-check below as
    // ALREADY_ATTACHED. The UNIQUEs are the real defence either way.
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await this.prisma.supplementalPractice.findFirst({
        where: { lessonId, sourceType: dto.sourceType, sourceKey: dto.sourceKey },
        select: { id: true },
      });
      if (existing) {
        throw new AppException(
          ErrorCode.SUPPLEMENT_ALREADY_ATTACHED,
          'Nội dung này đã được gắn vào bài học',
        );
      }
      const highest = await this.prisma.supplementalPractice.findFirst({
        where: { lessonId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      try {
        const row = await this.prisma.supplementalPractice.create({
          data: {
            lessonId,
            sourceType: dto.sourceType,
            sourceKey: dto.sourceKey,
            orderIndex: (highest?.orderIndex ?? 0) + 1,
          },
        });
        return { ...row, title, available: true };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue;
        }
        throw err;
      }
    }
    throw new AppException(
      ErrorCode.SUPPLEMENT_ORDER_CONFLICT,
      'Không gắn được nội dung lúc này, hãy thử lại',
    );
  }

  /**
   * Remove a link only. Never the source, never progress (separate stores, no FK).
   */
  async remove(lessonId: string, teacherId: string, supplementId: string) {
    if (!UUID_REGEX.test(supplementId)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }
    await this.loadOwnedLesson(lessonId, teacherId);
    const row = await this.prisma.supplementalPractice.findFirst({
      where: { id: supplementId, lessonId },
      select: { id: true },
    });
    if (!row) {
      throw new AppException(ErrorCode.SUPPLEMENT_NOT_ATTACHED, 'Bài học không có nội dung bổ trợ này');
    }
    // Gaps in orderIndex are allowed in storage (§6); reorder restores density.
    await this.prisma.supplementalPractice.delete({ where: { id: row.id } });
  }

  /**
   * Bulk reorder. The payload must be the complete dense 1..N permutation —
   * anything else is 409 and commits nothing (INV-TCL-08 mirror).
   */
  async reorder(
    lessonId: string,
    teacherId: string,
    items: ReorderSupplementItemDto[],
  ): Promise<SupplementItem[]> {
    await this.loadOwnedLesson(lessonId, teacherId);
    const current = await this.prisma.supplementalPractice.findMany({
      where: { lessonId },
      select: { id: true },
    });
    const ids = new Set(current.map((r) => r.id));
    const seen = new Set<string>();
    const orders: number[] = [];
    for (const item of items) {
      if (!ids.has(item.id) || seen.has(item.id)) {
        throw new AppException(
          ErrorCode.SUPPLEMENT_ORDER_CONFLICT,
          'Danh sách sắp xếp phải chứa đúng mỗi nội dung bổ trợ của bài học một lần',
        );
      }
      seen.add(item.id);
      orders.push(item.orderIndex);
    }
    if (items.length !== current.length) {
      throw new AppException(
        ErrorCode.SUPPLEMENT_ORDER_CONFLICT,
        `Danh sách sắp xếp phải chứa đủ ${current.length} nội dung bổ trợ của bài học`,
      );
    }
    const dense = [...orders].sort((a, b) => a - b).every((v, i) => v === i + 1);
    if (!dense) {
      throw new AppException(
        ErrorCode.SUPPLEMENT_ORDER_CONFLICT,
        `orderIndex phải là các số 1..${current.length}, mỗi số đúng một lần`,
      );
    }

    // Two-step shift inside one transaction (lessons.service.reorder mirror):
    // rows park at +10000 first so no intermediate state violates the unique index.
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.supplementalPractice.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex + 10000 },
        });
      }
      for (const item of items) {
        await tx.supplementalPractice.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        });
      }
    });

    return this.listForLesson(lessonId);
  }

  /**
   * Ordered supplements with read-time availability (INV-SUP-08). Unresolvable
   * sources keep id/type/order and lose everything else — never content.
   */
  async listForLesson(lessonId: string): Promise<SupplementItem[]> {
    const rows = await this.prisma.supplementalPractice.findMany({
      where: { lessonId },
      orderBy: { orderIndex: 'asc' },
    });
    if (!rows.length) return [];

    const unitSlugs = [...new Set(rows.filter((r) => r.sourceType === 'learning_unit').map((r) => r.sourceKey))];
    const grammarKeys = [...new Set(rows.filter((r) => r.sourceType === 'grammar_point').map((r) => r.sourceKey))];
    const [units, grams] = await Promise.all([
      unitSlugs.length ? this.catalog.findPublishedUnits(unitSlugs) : [],
      grammarKeys.length ? this.grammar.findPublishedGrammars(grammarKeys) : new Map(),
    ]);
    const unitBySlug = new Map(units.map((u) => [u.slug, u]));

    return rows.map((row) => {
      if (row.sourceType === 'learning_unit') {
        const unit = unitBySlug.get(row.sourceKey);
        return this.toItem(row, unit?.title ?? null, unit !== undefined);
      }
      const point = grams.get(row.sourceKey);
      return this.toItem(row, point?.name ?? null, point !== undefined);
    });
  }

  /** Attach-time check: the source must exist and be published/readable now. */
  private async resolveSourceTitle(
    sourceType: SupplementSourceType,
    sourceKey: string,
  ): Promise<string> {
    if (sourceType === 'learning_unit') {
      const units = await this.catalog.findPublishedUnits([sourceKey]);
      if (!units.length) {
        throw new AppException(
          ErrorCode.SUPPLEMENT_SOURCE_NOT_FOUND,
          'Không tìm thấy bài học bổ trợ đã publish này',
        );
      }
      return units[0].title;
    }
    const grams = await this.grammar.findPublishedGrammars([sourceKey]);
    const point = grams.get(sourceKey);
    if (!point) {
      throw new AppException(
        ErrorCode.SUPPLEMENT_SOURCE_NOT_FOUND,
        'Không tìm thấy điểm ngữ pháp này',
      );
    }
    return point.name;
  }

  private toItem(
    row: { id: string; sourceType: string; sourceKey: string; orderIndex: number },
    title: string | null,
    available: boolean,
  ): SupplementItem {
    return {
      id: row.id,
      sourceType: row.sourceType as SupplementSourceType,
      sourceKey: row.sourceKey,
      orderIndex: row.orderIndex,
      title,
      available,
    };
  }
}
