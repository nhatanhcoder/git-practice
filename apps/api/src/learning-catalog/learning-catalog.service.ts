import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LearningPathStatus, Prisma } from '@prisma/client';
import { FilterQuery, Model, isValidObjectId } from 'mongoose';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { LearningUnit, type LearningUnitDocument } from '../mongodb/schemas/learning-unit.schema';
import {
  UserLearningProgress,
  type UserLearningProgressDocument,
} from '../mongodb/schemas/user-learning-progress.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AdminLearningPathQuery,
  AdminPublishedLearningUnitQuery,
  CreateLearningPathDto,
  CreateLearningUnitDto,
  ReorderLearningUnitItemDto,
  TeacherLearningPathQuery,
  TeacherPublishedLearningUnitQuery,
  UpdateLearningPathDto,
  UpdateLearningUnitDto,
} from './dto/learning-catalog.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 20;

type WordRow = { hanzi: string; pinyin: string; meaning: string };
type UnitRow = {
  _id: unknown;
  slug: string;
  curriculum: string;
  pathId?: string;
  authorId?: string;
  kind?: 'authored' | 'reference';
  referenceSlug?: string;
  level: number;
  order: number;
  title: string;
  words: WordRow[];
  published: boolean;
  firstPublishedAt?: Date;
  moderatedById?: string;
  moderatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
type PathRow = Prisma.LearningPathGetPayload<Record<string, never>> & {
  owner?: { id: string; nickname: string | null };
  reviewer?: { id: string; nickname: string | null } | null;
  suspender?: { id: string; nickname: string | null } | null;
  restorer?: { id: string; nickname: string | null } | null;
};
type LearningPathClient = Pick<Prisma.TransactionClient, 'learningPath'>;

@Injectable()
export class LearningCatalogService {
  private readonly logger = new Logger(LearningCatalogService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @InjectModel(LearningUnit.name)
    private readonly units: Model<LearningUnitDocument>,
    @InjectModel(UserLearningProgress.name)
    private readonly progress: Model<UserLearningProgressDocument>,
  ) {}

  async createPath(ownerId: string, dto: CreateLearningPathDto) {
    const id = randomUUID();
    const title = dto.title.trim();
    assertLength(title, 3, 300, 'title');
    const path = await this.prisma.learningPath.create({
      data: {
        id,
        ownerId,
        title,
        description: cleanOptional(dto.description),
        curriculumKey: `tp-${slugify(title)}-${id.slice(0, 8)}`,
      },
    });
    return this.toPath(path, { unitCount: 0, publishedUnitCount: 0 });
  }

  async listTeacherPaths(ownerId: string, query: TeacherLearningPathQuery) {
    const page = query.page ?? 1;
    const where: Prisma.LearningPathWhereInput = {
      ownerId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, paths] = await this.prisma.$transaction([
      this.prisma.learningPath.count({ where }),
      this.prisma.learningPath.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    const counts = await this.unitCounts(paths.map((path) => path.id));
    return {
      data: paths.map((path) => this.toPath(path, counts.get(path.id))),
      meta: pageMeta(total, page),
    };
  }

  async teacherPathDetail(ownerId: string, pathId: string) {
    const path = await this.loadOwnedPath(ownerId, pathId);
    return this.pathDetail(path, false);
  }

  async updatePath(ownerId: string, pathId: string, dto: UpdateLearningPathDto) {
    if (dto.title !== undefined) assertLength(dto.title.trim(), 3, 300, 'title');
    const updated = await this.withPathLock(pathId, async (tx) => {
      const path = await this.loadOwnedPath(ownerId, pathId, tx);
      this.assertTeacherWritable(path.status);
      return tx.learningPath.update({
        where: { id: path.id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: cleanOptional(dto.description) } : {}),
        },
      });
    });
    return this.pathDetail(updated, false);
  }

  async removePath(ownerId: string, pathId: string) {
    const removedId = await this.withPathLock(pathId, async (tx) => {
      const path = await this.loadOwnedPath(ownerId, pathId, tx);
      this.assertTeacherWritable(path.status);
      if (path.status !== LearningPathStatus.draft && path.status !== LearningPathStatus.rejected) {
        throw new AppException(ErrorCode.LEARNING_PATH_INVALID_STATUS, 'Path đã duyệt không thể xoá');
      }
      const units = await this.units.find({ pathId: path.id }).select({ slug: 1, firstPublishedAt: 1 }).lean();
      if (units.some((unit) => unit.firstPublishedAt)) {
        throw new AppException(
          ErrorCode.LEARNING_PATH_HAS_PUBLISHED_UNITS,
          'Path có bài học đã từng publish nên không thể xoá',
        );
      }
      if (
        units.length &&
        (await this.progress.exists({
          unitSlug: { $in: units.map((unit) => unit.slug) },
        }))
      ) {
        throw new AppException(
          ErrorCode.LEARNING_PATH_HAS_PUBLISHED_UNITS,
          'Path đã có tiến độ học viên nên không thể xoá',
        );
      }

      // ADR-017 §4: Postgres remains the source of truth and commits before Mongo cleanup.
      await tx.learningPath.delete({ where: { id: path.id } });
      return path.id;
    });
    await this.units.deleteMany({ pathId: removedId });
    return { id: removedId };
  }

  async submitPath(ownerId: string, pathId: string) {
    const submittedAt = new Date();
    const { path, unitCount, result } = await this.withPathLock(pathId, async (tx) => {
      const path = await this.loadOwnedPath(ownerId, pathId, tx);
      this.assertTeacherWritable(path.status);
      if (path.status !== LearningPathStatus.draft && path.status !== LearningPathStatus.rejected) {
        throw new AppException(
          ErrorCode.LEARNING_PATH_INVALID_STATUS,
          'Path không thể gửi duyệt ở trạng thái hiện tại',
        );
      }
      const unitCount = await this.units.countDocuments({ pathId: path.id });
      if (unitCount === 0) {
        throw new AppException(ErrorCode.LEARNING_PATH_EMPTY, 'Path cần ít nhất một bài học trước khi gửi duyệt');
      }
      const changed = await tx.learningPath.updateMany({
        where: {
          id: path.id,
          ownerId,
          status: { in: ['draft', 'rejected'] },
        },
        data: {
          status: 'pending_review',
          submittedAt,
          reviewedById: null,
          reviewedAt: null,
          rejectionReason: null,
        },
      });
      if (changed.count !== 1) return { path, unitCount, result: changed };
      const admins = await tx.user.findMany({
        where: { role: 'admin', status: 'active' },
        select: { id: true },
      });
      await this.notifications.createManyWithinTx(
        tx,
        admins.map((admin) => ({
          userId: admin.id,
          type: 'learning_path_submitted',
          referenceId: path.id,
          referenceType: 'learning_path',
          payload: { pathId: path.id, ownerId, title: path.title },
        })),
      );
      return { path, unitCount, result: changed };
    });
    if (result.count !== 1) this.invalidTransition(path.id, path.status, 'pending_review');
    this.logger.log(`learning path submitted pathId=${path.id} ownerId=${ownerId} unitCount=${unitCount}`);
    return this.teacherPathDetail(ownerId, path.id);
  }

  async createUnit(ownerId: string, pathId: string, dto: CreateLearningUnitDto) {
    this.validateUnitCreate(dto);
    assertLength(dto.title.trim(), 3, 300, 'title');
    const words = dto.kind === 'authored' ? normaliseWords(dto.words!) : [];
    const unit = await this.withPathLock(pathId, async (tx) => {
      const path = await this.loadOwnedPath(ownerId, pathId, tx);
      this.assertTeacherWritable(path.status);
      const count = await this.units.countDocuments({ pathId: path.id });
      if (count >= 100) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, 'Mỗi path chỉ được tối đa 100 bài học');
      }
      if (dto.kind === 'reference') await this.assertValidReference(dto.referenceSlug!);

      const id = randomUUID().replaceAll('-', '').slice(0, 12);
      return this.units.create({
        slug: `${path.curriculumKey}-u${id}`,
        curriculum: path.curriculumKey,
        pathId: path.id,
        authorId: ownerId,
        kind: dto.kind,
        referenceSlug: dto.kind === 'reference' ? dto.referenceSlug : undefined,
        level: dto.level,
        order: count + 1,
        title: dto.title.trim(),
        sourceHash: hashUnit(dto.title.trim(), dto.level, words, dto.referenceSlug),
        words,
        published: false,
      });
    });
    return toUnit(unit.toObject(), true);
  }

  async updateUnit(ownerId: string, unitId: string, dto: UpdateLearningUnitDto) {
    if (dto.title !== undefined) assertLength(dto.title.trim(), 3, 300, 'title');
    const pathId = await this.pathIdForUnitLock(unitId);
    const updated = await this.withPathLock(pathId, async (tx) => {
      const { unit, path } = await this.loadOwnedUnit(ownerId, unitId, tx);
      this.assertTeacherWritable(path.status);
      this.assertUnitMutable(unit);
      if (unit.kind === 'reference' && dto.words !== undefined) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, 'Unit tham chiếu không nhận words');
      }
      const words = dto.words ? normaliseWords(dto.words) : unit.words;
      const title = dto.title?.trim() ?? unit.title;
      const level = dto.level ?? unit.level;
      return this.units
        .findByIdAndUpdate(
          unit._id,
          {
            ...(dto.title !== undefined ? { title } : {}),
            ...(dto.level !== undefined ? { level } : {}),
            ...(dto.words !== undefined ? { words } : {}),
            sourceHash: hashUnit(title, level, words, unit.referenceSlug),
          },
          { new: true },
        )
        .lean();
    });
    return toUnit(updated!, true);
  }

  async removeUnit(ownerId: string, unitId: string) {
    const pathId = await this.pathIdForUnitLock(unitId);
    return this.withPathLock(pathId, async (tx) => {
      const { unit, path } = await this.loadOwnedUnit(ownerId, unitId, tx);
      this.assertTeacherWritable(path.status);
      this.assertUnitMutable(unit);
      const session = await this.units.db.startSession();
      try {
        await session.withTransaction(async () => {
          await this.units.deleteOne({ _id: unit._id }, { session });
          await this.units.updateMany(
            { pathId: path.id, order: { $gt: unit.order } },
            { $inc: { order: -1 } },
            { session },
          );
        });
      } finally {
        await session.endSession();
      }
      return { id: String(unit._id) };
    });
  }

  async reorderUnits(ownerId: string, pathId: string, items: ReorderLearningUnitItemDto[]) {
    await this.withPathLock(pathId, async (tx) => {
      const path = await this.loadOwnedPath(ownerId, pathId, tx);
      this.assertTeacherWritable(path.status);
      const current = await this.units.find({ pathId: path.id }).sort({ order: 1 }).lean();
      this.assertPermutation(
        current.map((unit) => String(unit._id)),
        items,
      );

      const session = await this.units.db.startSession();
      try {
        await session.withTransaction(async () => {
          await this.units.bulkWrite(
            items.map((item, index) => ({
              updateOne: {
                filter: { _id: item.id, pathId: path.id },
                update: { $set: { order: -(index + 1) } },
              },
            })),
            { session, ordered: true },
          );
          await this.units.bulkWrite(
            items.map((item) => ({
              updateOne: {
                filter: { _id: item.id, pathId: path.id },
                update: { $set: { order: item.order } },
              },
            })),
            { session, ordered: true },
          );
        });
      } finally {
        await session.endSession();
      }
    });
    return this.teacherPathDetail(ownerId, pathId);
  }

  async publishUnit(ownerId: string, unitId: string) {
    const pathId = await this.pathIdForUnitLock(unitId);
    const updated = await this.withPathLock(pathId, async (tx) => {
      const { unit, path } = await this.loadOwnedUnit(ownerId, unitId, tx);
      this.assertTeacherWritable(path.status);
      if (path.status !== LearningPathStatus.approved) {
        throw new AppException(ErrorCode.LEARNING_PATH_INVALID_STATUS, 'Chỉ path đã duyệt mới được publish bài học');
      }
      if (unit.kind === 'reference') await this.assertValidReference(unit.referenceSlug!);
      const now = new Date();
      return this.units
        .findOneAndUpdate(
          { _id: unit._id, published: false },
          {
            $set: {
              published: true,
              ...(unit.firstPublishedAt ? {} : { firstPublishedAt: now }),
            },
          },
          { new: true },
        )
        .lean();
    });
    if (!updated) {
      throw new AppException(ErrorCode.LEARNING_UNIT_PUBLISHED_IMMUTABLE, 'Bài học đã được publish');
    }
    return toUnit(updated, true);
  }

  async teacherUnpublishUnit(ownerId: string, unitId: string) {
    const pathId = await this.pathIdForUnitLock(unitId);
    return this.withPathLock(pathId, async (tx) => {
      const { unit, path } = await this.loadOwnedUnit(ownerId, unitId, tx);
      this.assertTeacherWritable(path.status);
      return this.unpublishUnit(unit);
    });
  }

  async adminUnpublishUnit(adminId: string, unitId: string) {
    const unit = await this.loadUnit(unitId);
    if (!unit.firstPublishedAt) {
      throw new AppException(ErrorCode.LEARNING_UNIT_NOT_FOUND, 'Không tìm thấy bài học đã publish');
    }
    if (!unit.pathId || !UUID.test(unit.pathId)) return this.unpublishUnit(unit, adminId);
    return this.withPathLock(unit.pathId, async () => {
      const current = await this.loadUnit(unitId);
      return this.unpublishUnit(current, adminId);
    });
  }

  async listPublishedUnits(
    query: TeacherPublishedLearningUnitQuery | AdminPublishedLearningUnitQuery,
    includeSuspended = false,
  ) {
    const page = query.page ?? 1;
    const filter: FilterQuery<LearningUnitDocument> = { published: true };
    if ('level' in query && query.level) filter.level = query.level;
    if ('curriculum' in query && query.curriculum) filter.curriculum = query.curriculum;
    if ('teacherId' in query && query.teacherId) filter.authorId = query.teacherId;
    if ('pathId' in query && query.pathId) filter.pathId = query.pathId;
    if (!includeSuspended) {
      const approved = await this.prisma.learningPath.findMany({
        where: { status: 'approved' },
        select: { id: true },
      });
      filter.$or = [
        { pathId: { $exists: false } },
        { pathId: null },
        { pathId: { $in: approved.map((path) => path.id) } },
      ];
    }
    const total = await this.units.countDocuments(filter);
    const rows = await this.units
      .find(filter)
      .sort({ updatedAt: -1, _id: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();
    const wordCounts = await this.referenceWordCounts(rows);
    return {
      data: rows.map((row) => toUnit(row, false, includeSuspended, wordCounts.get(row.slug))),
      meta: pageMeta(total, page),
    };
  }

  async listAdminPaths(query: AdminLearningPathQuery) {
    const page = query.page ?? 1;
    const where: Prisma.LearningPathWhereInput = {
      status: query.status ?? 'pending_review',
      ...(query.teacherId ? { ownerId: query.teacherId } : {}),
    };
    const [total, paths] = await this.prisma.$transaction([
      this.prisma.learningPath.count({ where }),
      this.prisma.learningPath.findMany({
        where,
        include: { owner: { select: { id: true, nickname: true } } },
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    const counts = await this.unitCounts(paths.map((path) => path.id));
    return {
      data: paths.map((path) => ({
        ...this.toPath(path, counts.get(path.id)),
        owner: path.owner,
      })),
      meta: pageMeta(total, page),
    };
  }

  async adminPathDetail(pathId: string) {
    const path = await this.loadAdminPath(pathId);
    return this.pathDetail(path, true);
  }

  async approvePath(adminId: string, pathId: string) {
    const path = await this.loadAdminPath(pathId);
    if (path.status !== LearningPathStatus.pending_review) {
      this.invalidTransition(path.id, path.status, LearningPathStatus.approved);
    }
    const unitCount = await this.units.countDocuments({ pathId: path.id });
    if (unitCount === 0) {
      throw new AppException(ErrorCode.LEARNING_PATH_EMPTY, 'Path cần ít nhất một bài học để duyệt');
    }
    return this.moderatePath(path, adminId, 'pending_review', 'approved', 'learning_path_approved', {
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: null,
    });
  }

  async rejectPath(adminId: string, pathId: string, reason: string) {
    const rejectionReason = reason.trim();
    if (rejectionReason.length < 10 || rejectionReason.length > 2000) {
      throw new AppException(
        ErrorCode.LEARNING_PATH_REJECTION_REASON_REQUIRED,
        'Lý do từ chối phải có từ 10 đến 2000 ký tự',
      );
    }
    const path = await this.loadAdminPath(pathId);
    return this.moderatePath(path, adminId, 'pending_review', 'rejected', 'learning_path_rejected', {
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason,
    });
  }

  async suspendPath(adminId: string, pathId: string) {
    const path = await this.loadAdminPath(pathId);
    return this.moderatePath(path, adminId, 'approved', 'suspended', 'learning_path_suspended', {
      suspendedById: adminId,
      suspendedAt: new Date(),
      restoredById: null,
      restoredAt: null,
    });
  }

  async restorePath(adminId: string, pathId: string) {
    const path = await this.loadAdminPath(pathId);
    return this.moderatePath(path, adminId, 'suspended', 'approved', null, {
      restoredById: adminId,
      restoredAt: new Date(),
    });
  }

  private async moderatePath(
    path: Awaited<ReturnType<LearningCatalogService['loadAdminPath']>>,
    adminId: string,
    source: LearningPathStatus,
    target: LearningPathStatus,
    notification: 'learning_path_approved' | 'learning_path_rejected' | 'learning_path_suspended' | null,
    data: Prisma.LearningPathUncheckedUpdateManyInput,
  ) {
    const { changed, current } = await this.withPathLock(path.id, async (tx) => {
      const current = await this.loadAdminPath(path.id, tx);
      const result = await tx.learningPath.updateMany({
        where: { id: current.id, status: source },
        data: { ...data, status: target },
      });
      if (result.count === 1 && notification) {
        await this.notifications.createManyWithinTx(tx, [
          {
            userId: current.ownerId,
            type: notification,
            referenceId: current.id,
            referenceType: 'learning_path',
            payload: {
              pathId: current.id,
              title: current.title,
              actorId: adminId,
            },
          },
        ]);
      }
      return { changed: result, current };
    });
    if (changed.count !== 1) this.invalidTransition(current.id, current.status, target);
    this.logger.log(`learning path moderated actor=${adminId} pathId=${current.id} ${source}->${target}`);
    return this.adminPathDetail(current.id);
  }

  private async pathDetail(path: PathRow, admin: boolean) {
    const units = await this.units.find({ pathId: path.id }).sort({ order: 1 }).lean();
    const wordCounts = await this.referenceWordCounts(units);
    const base = this.toPath(path, {
      unitCount: units.length,
      publishedUnitCount: units.filter((unit) => unit.published).length,
    });
    return {
      ...base,
      ...(admin
        ? {
            owner: path.owner ?? null,
            reviewedBy: path.reviewer ?? null,
            suspendedBy: path.suspender ?? null,
            restoredBy: path.restorer ?? null,
          }
        : {}),
      units: units.map((unit) => toUnit(unit, true, admin, wordCounts.get(unit.slug))),
    };
  }

  private async withPathLock<T>(pathId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const lockKey = `learning-catalog:${pathId}`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS lock_result`;
        return operation(tx);
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
  }

  private async pathIdForUnitLock(unitId: string) {
    const unit = await this.loadUnit(unitId);
    if (!unit.pathId || !UUID.test(unit.pathId)) {
      throw new AppException(ErrorCode.LEARNING_UNIT_NOT_OWNED, 'Bài học không thuộc giáo viên hiện tại');
    }
    return unit.pathId;
  }

  private async loadOwnedPath(ownerId: string, pathId: string, client: LearningPathClient = this.prisma) {
    if (!UUID.test(pathId)) throw new AppException(ErrorCode.LEARNING_PATH_NOT_FOUND, 'Không tìm thấy path');
    const path = await client.learningPath.findUnique({
      where: { id: pathId },
    });
    if (!path) throw new AppException(ErrorCode.LEARNING_PATH_NOT_FOUND, 'Không tìm thấy path');
    if (!ownerId || path.ownerId !== ownerId) {
      throw new AppException(ErrorCode.LEARNING_PATH_ACCESS_DENIED, 'Path không thuộc giáo viên hiện tại');
    }
    return path;
  }

  private async loadAdminPath(pathId: string, client: LearningPathClient = this.prisma) {
    if (!UUID.test(pathId)) throw new AppException(ErrorCode.LEARNING_PATH_NOT_FOUND, 'Không tìm thấy path');
    const path = await client.learningPath.findUnique({
      where: { id: pathId },
      include: {
        owner: { select: { id: true, nickname: true } },
        reviewer: { select: { id: true, nickname: true } },
        suspender: { select: { id: true, nickname: true } },
        restorer: { select: { id: true, nickname: true } },
      },
    });
    if (!path) throw new AppException(ErrorCode.LEARNING_PATH_NOT_FOUND, 'Không tìm thấy path');
    return path;
  }

  private async loadOwnedUnit(ownerId: string, unitId: string, client: LearningPathClient = this.prisma) {
    const unit = await this.loadUnit(unitId);
    if (!unit.pathId || !UUID.test(unit.pathId)) {
      throw new AppException(ErrorCode.LEARNING_UNIT_NOT_OWNED, 'Bài học không thuộc giáo viên hiện tại');
    }
    const path = await client.learningPath.findUnique({
      where: { id: unit.pathId },
    });
    if (!path || path.ownerId !== ownerId || unit.authorId !== ownerId) {
      throw new AppException(ErrorCode.LEARNING_UNIT_NOT_OWNED, 'Bài học không thuộc giáo viên hiện tại');
    }
    return { unit, path };
  }

  private async loadUnit(unitId: string) {
    if (!isValidObjectId(unitId)) {
      throw new AppException(ErrorCode.LEARNING_UNIT_NOT_FOUND, 'Không tìm thấy bài học');
    }
    const unit = await this.units.findById(unitId).lean();
    if (!unit) throw new AppException(ErrorCode.LEARNING_UNIT_NOT_FOUND, 'Không tìm thấy bài học');
    return unit;
  }

  private assertTeacherWritable(status: LearningPathStatus) {
    if (status === LearningPathStatus.pending_review || status === LearningPathStatus.suspended) {
      throw new AppException(ErrorCode.LEARNING_PATH_FROZEN, 'Path đang bị đóng băng');
    }
  }

  private assertUnitMutable(unit: UnitRow) {
    if (unit.firstPublishedAt) {
      throw new AppException(
        ErrorCode.LEARNING_UNIT_PUBLISHED_IMMUTABLE,
        'Bài học đã từng publish nên nội dung là bất biến',
      );
    }
  }

  private validateUnitCreate(dto: CreateLearningUnitDto) {
    if (dto.kind === 'authored' && (dto.referenceSlug !== undefined || !dto.words)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Unit tự soạn chỉ nhận words');
    }
    if (dto.kind === 'reference' && (dto.words !== undefined || !dto.referenceSlug)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Unit tham chiếu chỉ nhận referenceSlug');
    }
    if (dto.words) normaliseWords(dto.words);
  }

  private async assertValidReference(referenceSlug: string) {
    const source = await this.units.findOne({ slug: referenceSlug, published: true }).lean();
    if (!source) {
      throw new AppException(ErrorCode.LEARNING_UNIT_REFERENCE_INVALID, 'Bài học tham chiếu không khả dụng');
    }
    if (source.pathId) {
      const sourcePath = await this.prisma.learningPath.findUnique({
        where: { id: source.pathId },
        select: { status: true },
      });
      if (sourcePath?.status !== LearningPathStatus.approved) {
        throw new AppException(ErrorCode.LEARNING_UNIT_REFERENCE_INVALID, 'Path nguồn không khả dụng');
      }
    }
  }

  private assertPermutation(currentIds: string[], items: ReorderLearningUnitItemDto[]) {
    const ids = items.map((item) => item.id);
    const orders = items.map((item) => item.order);
    const expectedOrders = Array.from({ length: currentIds.length }, (_, index) => index + 1);
    const valid =
      items.length === currentIds.length &&
      new Set(ids).size === ids.length &&
      currentIds.every((id) => ids.includes(id)) &&
      new Set(orders).size === orders.length &&
      [...orders].sort((a, b) => a - b).every((order, index) => order === expectedOrders[index]);
    if (!valid) {
      throw new AppException(ErrorCode.LEARNING_UNIT_ORDER_INVALID, 'Thứ tự bài học phải là permutation 1..N');
    }
  }

  private async unpublishUnit(unit: UnitRow, moderatedById?: string) {
    const updated = await this.units
      .findOneAndUpdate(
        { _id: unit._id, published: true },
        {
          $set: {
            published: false,
            ...(moderatedById ? { moderatedById, moderatedAt: new Date() } : {}),
          },
        },
        { new: true },
      )
      .lean();
    if (!updated) {
      throw new AppException(ErrorCode.LEARNING_PATH_INVALID_STATUS, 'Bài học không ở trạng thái published');
    }
    this.logger.log(`learning unit unpublished unitId=${String(unit._id)} pathId=${unit.pathId ?? 'builtin'}`);
    return toUnit(updated, true, Boolean(moderatedById));
  }

  private async referenceWordCounts(units: UnitRow[]) {
    const references = units.filter((unit) => unit.kind === 'reference' && unit.referenceSlug);
    const counts = await Promise.all(
      references.map(async (unit) => [unit.slug, await this.resolveReferenceWordCount(unit.referenceSlug!)] as const),
    );
    return new Map(counts);
  }

  private async resolveReferenceWordCount(slug: string) {
    const seen = new Set<string>();
    let current = slug;
    while (!seen.has(current)) {
      seen.add(current);
      const source = await this.units.findOne({ slug: current }).lean();
      if (!source) return 0;
      if (source.kind !== 'reference') return source.words?.length ?? 0;
      if (!source.referenceSlug) return 0;
      current = source.referenceSlug;
    }
    return 0;
  }

  private async unitCounts(pathIds: string[]) {
    const map = new Map<string, { unitCount: number; publishedUnitCount: number }>();
    if (!pathIds.length) return map;
    const rows = await this.units.aggregate<{
      _id: string;
      unitCount: number;
      publishedUnitCount: number;
    }>([
      { $match: { pathId: { $in: pathIds } } },
      {
        $group: {
          _id: '$pathId',
          unitCount: { $sum: 1 },
          publishedUnitCount: { $sum: { $cond: ['$published', 1, 0] } },
        },
      },
    ]);
    for (const row of rows) map.set(row._id, row);
    return map;
  }

  private toPath(path: PathRow, counts?: { unitCount: number; publishedUnitCount: number }) {
    return {
      id: path.id,
      title: path.title,
      description: path.description ?? null,
      curriculumKey: path.curriculumKey,
      status: path.status,
      submittedAt: iso(path.submittedAt),
      reviewedAt: iso(path.reviewedAt),
      rejectionReason: path.rejectionReason ?? null,
      suspendedAt: iso(path.suspendedAt),
      restoredAt: iso(path.restoredAt),
      unitCount: counts?.unitCount ?? 0,
      publishedUnitCount: counts?.publishedUnitCount ?? 0,
      createdAt: iso(path.createdAt),
      updatedAt: iso(path.updatedAt),
    };
  }

  private invalidTransition(pathId: string, source: string, target: string): never {
    this.logger.warn(`learning path transition rejected pathId=${pathId} source=${source} target=${target}`);
    throw new AppException(ErrorCode.LEARNING_PATH_INVALID_STATUS, 'Chuyển trạng thái path không hợp lệ');
  }
}

function pageMeta(total: number, page: number) {
  return {
    total,
    page,
    limit: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

function cleanOptional(value?: string) {
  if (value === undefined) return null;
  const clean = value.trim();
  return clean || null;
}

function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'learning-path'
  );
}

function normaliseWords(words: Array<{ hanzi: string; pinyin: string; meaning: string }>) {
  const normalised = words.map((word) => ({
    hanzi: word.hanzi.trim(),
    pinyin: word.pinyin.trim(),
    meaning: word.meaning.trim(),
  }));
  if (normalised.some((word) => !word.hanzi || !word.pinyin || !word.meaning)) {
    throw new AppException(ErrorCode.VALIDATION_ERROR, 'Từ vựng không được để trống');
  }
  if (new Set(normalised.map((word) => word.hanzi)).size !== normalised.length) {
    throw new AppException(ErrorCode.VALIDATION_ERROR, 'Không được trùng hanzi trong cùng bài học');
  }
  return normalised;
}

function hashUnit(
  title: string,
  level: number,
  words: Array<{ hanzi: string; pinyin: string; meaning: string }>,
  referenceSlug?: string,
) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        title,
        level,
        words,
        referenceSlug: referenceSlug ?? null,
      }),
    )
    .digest('hex');
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function toUnit(row: UnitRow, includeWords: boolean, includeModeration = false, resolvedWordCount?: number) {
  return {
    id: String(row._id),
    slug: row.slug,
    order: row.order,
    title: row.title,
    level: row.level,
    kind: row.kind ?? 'authored',
    published: Boolean(row.published),
    wordCount: resolvedWordCount ?? row.words?.length ?? 0,
    referenceSlug: row.referenceSlug ?? null,
    ...(includeWords && row.kind !== 'reference'
      ? {
          words: (row.words ?? []).map((word) => ({
            hanzi: word.hanzi,
            pinyin: word.pinyin,
            meaning: word.meaning,
          })),
        }
      : {}),
    ...(includeModeration
      ? {
          moderation: row.moderatedAt
            ? {
                moderatedById: row.moderatedById ?? null,
                moderatedAt: iso(row.moderatedAt),
              }
            : null,
        }
      : {}),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function assertLength(value: string, min: number, max: number, field: string) {
  if (value.length < min || value.length > max) {
    throw new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', {
      [field]: [`${field} phải có từ ${min} đến ${max} ký tự sau khi trim`],
    });
  }
}
