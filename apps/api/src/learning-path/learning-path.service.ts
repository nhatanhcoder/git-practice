import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  LearningUnit,
  type LearningUnitDocument,
} from "../mongodb/schemas/learning-unit.schema";
import {
  UserLearningProgress,
  type UserLearningProgressDocument,
} from "../mongodb/schemas/user-learning-progress.schema";
import { AppException } from "../common/errors/app.exception";
import { ErrorCode } from "../common/errors/error-codes";
import { PrismaService } from "../prisma/prisma.service";
import type {
  LearningPathQuery,
  SaveLearningAnswerDto,
  StudyWordDto,
} from "./learning-path.dto";
import { gradeLearning, learningQuiz } from "./learning-path.rules";

type LearningUnitView = {
  kind?: "authored" | "reference";
  referenceSlug?: string;
  pathId?: string;
  slug: string;
  curriculum: string;
  level: number;
  order: number;
  title: string;
  words: Array<{ hanzi: string; pinyin: string; meaning: string }>;
};

@Injectable()
export class LearningPathService {
  constructor(
    @InjectModel(LearningUnit.name)
    private readonly units: Model<LearningUnitDocument>,
    @InjectModel(UserLearningProgress.name)
    private readonly progress: Model<UserLearningProgressDocument>,
    private readonly prisma: PrismaService,
  ) {}
  async curricula(userId: string) {
    const paths = await this.prisma.learningPath.findMany({
      where: { status: "approved" },
      select: { id: true, curriculumKey: true, title: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const units = await this.units
      .find({
        published: true,
        $or: [
          { curriculum: "hanlo_vocabulary", pathId: { $exists: false } },
          { pathId: { $in: paths.map((path) => path.id) } },
        ],
      })
      .select({ slug: 1, curriculum: 1 })
      .lean();
    const completed = await this.progress
      .find({ userId, unitSlug: { $in: units.map((unit) => unit.slug) }, status: "completed" })
      .select({ unitSlug: 1 })
      .lean();
    const completedSlugs = new Set(completed.map((row) => row.unitSlug));
    const summary = (key: string, title: string) => {
      const rows = units.filter((unit) => unit.curriculum === key);
      return {
        key,
        title,
        unitCount: rows.length,
        completed: rows.filter((unit) => completedSlugs.has(unit.slug)).length,
      };
    };
    return [
      summary("hanlo_vocabulary", "Hán Lộ Vocabulary"),
      ...paths.map((path) => summary(path.curriculumKey, path.title)),
    ];
  }
  async catalog(userId: string, query: LearningPathQuery) {
    const { curriculum, level, page } = query;
    if (curriculum !== "hanlo_vocabulary") {
      const visible = await this.prisma.learningPath.findFirst({
        where: { curriculumKey: curriculum, status: "approved" },
        select: { id: true },
      });
      if (!visible) {
        return { curriculum, level, units: [], total: 0, completed: 0, page, totalPages: 0 };
      }
    }
    const units = await this.units
      .find({ curriculum, level, published: true })
      .sort({ order: 1 })
      .lean();
    const availability = await this.referenceAvailability(units);
    const states = await this.progress
      .find({ userId, unitSlug: { $in: units.map((u) => u.slug) } })
      .lean();
    const bySlug = new Map(states.map((p) => [p.unitSlug, p]));
    const items = units.map((u, index) => {
      const state = !availability.get(u.slug)
        ? "unavailable"
        : bySlug.get(u.slug)?.status ??
          (index === 0 || bySlug.get(units[index - 1].slug)?.status === "completed"
            ? "available"
            : "locked");
      return {
        slug: u.slug,
        title: u.title,
        level: u.level,
        order: u.order,
        wordCount: availability.get(u.slug)?.words.length ?? 0,
        state,
      };
    });
    return {
      curriculum,
      level,
      units: items.slice((page - 1) * 12, page * 12),
      total: units.length,
      completed: states.filter((p) => p.status === "completed").length,
      page,
      totalPages: Math.ceil(units.length / 12),
    };
  }
  private async accessible(userId: string, slug: string) {
    if (!/^[a-z0-9-]{1,100}$/.test(slug))
      throw new AppException(
        ErrorCode.LEARNING_UNIT_NOT_FOUND,
        "Không tìm thấy bài học",
      );
    const unit = await this.units.findOne({ slug, published: true }).lean();
    if (!unit)
      throw new AppException(
        ErrorCode.LEARNING_UNIT_NOT_FOUND,
        "Không tìm thấy bài học",
      );
    if (unit.pathId) {
      const path = await this.prisma.learningPath.findFirst({
        where: { id: unit.pathId, status: "approved" },
        select: { id: true },
      });
      if (!path)
        throw new AppException(
          ErrorCode.LEARNING_UNIT_NOT_FOUND,
          "Không tìm thấy bài học",
        );
    }
    const resolved = await this.resolveWords(unit);
    if (!resolved.words.length)
      throw new AppException(
        ErrorCode.LEARNING_UNIT_NOT_FOUND,
        "Không tìm thấy bài học",
      );
    const previous = await this.units
      .findOne({
        curriculum: unit.curriculum,
        level: unit.level,
        published: true,
        order: { $lt: unit.order },
      })
      .sort({ order: -1 })
      .lean();
    if (
      previous &&
      !(await this.progress.exists({
        userId,
        unitSlug: previous.slug,
        status: "completed",
      }))
    )
      throw new AppException(
        ErrorCode.LEARNING_UNIT_LOCKED,
        "Hãy hoàn thành bài trước để mở bài này",
      );
    return resolved;
  }

  private async referenceAvailability(units: LearningUnitView[]) {
    const rows = await Promise.all(
      units.map(async (unit) => {
        if (unit.kind !== "reference") return [unit.slug, unit] as const;
        const resolved = await this.resolveWords(unit);
        return [unit.slug, resolved.words.length ? resolved : null] as const;
      }),
    );
    return new Map(rows);
  }

  private async resolveWords(unit: LearningUnitView) {
    const original = unit;
    const seen = new Set<string>();
    let current = unit;
    while (current.kind === "reference") {
      if (!current.referenceSlug || seen.has(current.referenceSlug)) return { ...original, words: [] };
      seen.add(current.referenceSlug);
      const source = await this.units.findOne({ slug: current.referenceSlug, published: true }).lean();
      if (!source) return { ...original, words: [] };
      if (source.pathId) {
        const path = await this.prisma.learningPath.findFirst({
          where: { id: source.pathId, status: "approved" },
          select: { id: true },
        });
        if (!path) return { ...original, words: [] };
      }
      current = source;
    }
    return { ...original, words: current.words };
  }
  async detail(userId: string, slug: string) {
    const unit = await this.accessible(userId, slug);
    const [progress, next] = await Promise.all([
      this.progress.findOne({ userId, unitSlug: slug }).lean(),
      this.units
        .findOne({
          curriculum: unit.curriculum,
          level: unit.level,
          published: true,
          order: { $gt: unit.order },
        })
        .sort({ order: 1 })
        .lean(),
    ]);
    return {
      unit: {
        slug,
        title: unit.title,
        level: unit.level,
        order: unit.order,
        words: unit.words.map((w: { hanzi: string; pinyin: string; meaning: string }) => ({
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          meaning: w.meaning,
        })),
      },
      progress: progress
        ? {
            status: progress.status,
            studyIndex: progress.studyIndex,
            answers: progress.answers,
            revision: progress.revision,
            bestScore: progress.bestScore,
            lastScore: progress.lastScore,
            completedAt: progress.completedAt?.toISOString() ?? null,
          }
        : null,
      quiz: learningQuiz(unit),
      nextSlug: next?.slug ?? null,
      result:
        progress?.lastScore != null
          ? gradeLearning(unit, progress.answers)
          : null,
    };
  }
  async start(userId: string, slug: string) {
    const unit = await this.accessible(userId, slug);
    try {
      await this.progress.updateOne(
        { userId, unitSlug: slug },
        {
          $setOnInsert: {
            userId,
            unitSlug: slug,
            status: "in_progress",
            studyIndex: 0,
            revision: 1,
            answers: unit.words.map(() => ""),
            bestScore: 0,
            lastScore: null,
            startedAt: new Date(),
            completedAt: null,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ))
        throw error;
    }
    return this.detail(userId, slug);
  }
  private async current(userId: string, slug: string, revision: number) {
    const unit = await this.accessible(userId, slug);
    const progress = await this.progress
      .findOne({ userId, unitSlug: slug })
      .lean();
    if (
      !progress ||
      progress.revision !== revision ||
      progress.status !== "in_progress"
    )
      throw new AppException(
        ErrorCode.LEARNING_PROGRESS_CONFLICT,
        "Tiến độ đã thay đổi. Hãy tải lại bài học",
      );
    return { unit, progress };
  }
  private async mutate(
    userId: string,
    slug: string,
    revision: number,
    set: Record<string, unknown>,
    max?: Record<string, number>,
  ) {
    const update = {
      $set: set,
      $inc: { revision: 1 },
      ...(max ? { $max: max } : {}),
    };
    const result = await this.progress.updateOne(
      { userId, unitSlug: slug, revision, status: "in_progress" },
      update,
    );
    if (result.modifiedCount !== 1)
      throw new AppException(
        ErrorCode.LEARNING_PROGRESS_CONFLICT,
        "Tiến độ đã thay đổi. Hãy tải lại bài học",
      );
    return this.detail(userId, slug);
  }
  async study(userId: string, slug: string, dto: StudyWordDto) {
    const { unit, progress } = await this.current(userId, slug, dto.revision);
    if (dto.index !== progress.studyIndex || dto.index >= unit.words.length)
      throw new AppException(
        ErrorCode.LEARNING_STEP_INVALID,
        "Cần học theo thứ tự từ hiện tại",
      );
    return this.mutate(userId, slug, dto.revision, {
      studyIndex: dto.index + 1,
    });
  }
  async answer(userId: string, slug: string, dto: SaveLearningAnswerDto) {
    const { unit, progress } = await this.current(userId, slug, dto.revision);
    const question = learningQuiz(unit)[dto.index];
    if (
      progress.studyIndex !== unit.words.length ||
      !question?.options.some((o) => o.id === dto.choiceId)
    )
      throw new AppException(
        ErrorCode.LEARNING_STEP_INVALID,
        "Hãy học đủ từ và chọn đáp án hợp lệ",
      );
    return this.mutate(userId, slug, dto.revision, {
      [`answers.${dto.index}`]: dto.choiceId,
      lastScore: null,
    });
  }
  async complete(userId: string, slug: string, revision: number) {
    const { unit, progress } = await this.current(userId, slug, revision);
    const quiz = learningQuiz(unit);
    if (
      progress.studyIndex !== unit.words.length ||
      progress.answers.length !== unit.words.length ||
      !quiz.every((q, i) => q.options.some((o) => o.id === progress.answers[i]))
    )
      throw new AppException(
        ErrorCode.LEARNING_STEP_INVALID,
        "Hãy học và trả lời đủ câu hỏi",
      );
    const result = gradeLearning(unit, progress.answers);
    return this.mutate(
      userId,
      slug,
      revision,
      {
        lastScore: result.score,
        ...(result.passed
          ? { status: "completed", completedAt: new Date() }
          : {}),
      },
      { bestScore: result.score },
    );
  }
}
