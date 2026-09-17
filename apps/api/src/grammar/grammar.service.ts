import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import {
  ContentRevision,
  type ContentRevisionDocument,
} from '../mongodb/schemas/content-revision.schema';
import {
  GrammarItem,
  type GrammarItemDocument,
} from '../mongodb/schemas/grammar-item.schema';
import {
  compareGrammar,
  isCorrectReorder,
  matchesGrammarSearch,
  shuffledTokens,
  toListItem,
} from './grammar-rules';
import type { ListGrammarQueryDto } from './dto/grammar.dto';

/**
 * Grammar catalog + studied-state + reorder practice (02-foundation-grammar.md).
 * Same scoping and no-cross-DB-transaction rules as FoundationService.
 *
 * Answer hygiene (§3): `tokens` is the reorder answer. It is stored in Mongo
 * but NEVER served by list/detail — it travels only inside the deterministically
 * shuffled practice payload, and grading always runs server-side (ADR-005).
 *
 * Practice idempotency (§8): one row per (user, point, submissionId). A replay
 * returns the stored result; a conflicting retry is rejected; concurrent
 * duplicates collapse on the unique index and read back the winner.
 */
@Injectable()
export class GrammarService {
  constructor(
    @InjectModel(GrammarItem.name)
    private readonly items: Model<GrammarItemDocument>,
    @InjectModel(ContentRevision.name)
    private readonly revisions: Model<ContentRevisionDocument>,
    private readonly prisma: PrismaService,
  ) {}

  async currentRevision(): Promise<string | null> {
    const row = await this.revisions
      .findOne({ name: 'grammar' })
      .sort({ importedAt: -1, _id: -1 })
      .select({ revision: 1 })
      .lean();
    return row?.revision ?? null;
  }

  async list(query: ListGrammarQueryDto) {
    const revision = await this.currentRevision();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    if (!revision) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }
    const docs = await this.items.find({ revision }).lean();
    const q = (query.search ?? '').trim();
    const filtered = docs.filter((d) => {
      if (query.hskLevel !== undefined && d.level !== query.hskLevel) return false;
      if (query.category !== undefined && d.category !== query.category) return false;
      if (!q) return true;
      const data = d.data as Record<string, unknown>;
      return matchesGrammarSearch(
        {
          name: String(data.name ?? ''),
          formula: String(data.formula ?? ''),
          hanzi: String(data.hanzi ?? ''),
          pinyin: String(data.pinyin ?? ''),
          vi: String(data.vi ?? ''),
        },
        q,
      );
    });
    filtered.sort((a, b) => compareGrammar(a, b));
    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const slice = filtered.slice((page - 1) * limit, page * limit);
    return {
      data: slice.map((d) => toListItem(d.data as Record<string, unknown>)),
      meta: { total, page, limit, totalPages },
    };
  }

  async getOne(id: string) {
    const doc = await this.findDoc(id);
    if (!doc) {
      throw new AppException(
        ErrorCode.GRAMMAR_NOT_FOUND,
        'Không tìm thấy điểm ngữ pháp này',
      );
    }
    return toListItem(doc.data as Record<string, unknown>);
  }

  async getProgress(studentId: string): Promise<{
    studied: Array<{ grammarId: string; studied: boolean; updatedAt: string }>;
    practice: Array<{ grammarId: string; attempts: number; correct: number }>;
  }> {
    const [studiedRows, attempts] = await Promise.all([
      this.prisma.userStudyProgress.findMany({
        where: { userId: studentId, contentKind: 'grammar' },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.grammarPracticeAttempt.findMany({
        where: { userId: studentId },
        select: { grammarId: true, correct: true },
      }),
    ]);
    const byPoint = new Map<string, { attempts: number; correct: number }>();
    for (const a of attempts) {
      const entry = byPoint.get(a.grammarId) ?? { attempts: 0, correct: 0 };
      entry.attempts++;
      if (a.correct) entry.correct++;
      byPoint.set(a.grammarId, entry);
    }
    return {
      studied: studiedRows.map((r) => ({
        grammarId: r.contentKey,
        studied: r.studied,
        updatedAt: r.updatedAt.toISOString(),
      })),
      practice: [...byPoint.entries()].map(([grammarId, counts]) => ({
        grammarId,
        ...counts,
      })),
    };
  }

  async setProgress(studentId: string, grammarId: string, studied: boolean) {
    const revision = await this.currentRevision();
    const known =
      revision !== null &&
      (await this.items.exists({ revision, key: grammarId })) !== null;
    if (!known) {
      throw new AppException(
        ErrorCode.GRAMMAR_NOT_FOUND,
        'Không tìm thấy điểm ngữ pháp này',
      );
    }
    const row = await this.prisma.userStudyProgress.upsert({
      where: {
        userId_contentKind_contentKey: {
          userId: studentId,
          contentKind: 'grammar',
          contentKey: grammarId,
        },
      },
      create: { userId: studentId, contentKind: 'grammar', contentKey: grammarId, studied },
      update: { studied },
    });
    return { grammarId, studied: row.studied, updatedAt: row.updatedAt.toISOString() };
  }

  /**
   * GET /student/grammar/:id/practice — the reorder exercise. Tokens are
   * shuffled deterministically per point id, so a reload mid-exercise keeps
   * the learner's draft valid.
   */
  async getPractice(grammarId: string) {
    const { tokens, vi } = await this.practiceSource(grammarId);
    return {
      id: grammarId,
      prompt: vi,
      hanziLength: tokens.length,
      tokens: shuffledTokens(grammarId, tokens),
    };
  }

  /**
   * POST /student/grammar/:id/practice — server grades exact token order.
   * Idempotent per submissionId (§8): replays return the stored row, conflicts
   * are rejected, concurrent duplicates collapse on the unique index.
   */
  async submitPractice(
    studentId: string,
    grammarId: string,
    submissionId: string,
    answer: string[],
  ) {
    const { tokens } = await this.practiceSource(grammarId);
    const correct = isCorrectReorder(tokens, answer);
    const where = {
      userId_grammarId_submissionId: {
        userId: studentId,
        grammarId,
        submissionId,
      },
    };
    const existing = await this.prisma.grammarPracticeAttempt.findUnique({ where });
    if (existing) {
      return this.resolveReplay(studentId, grammarId, existing, answer);
    }
    try {
      await this.prisma.grammarPracticeAttempt.create({
        data: { userId: studentId, grammarId, submissionId, answer, correct },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // A concurrent duplicate won the race — read back the winner.
        const winner = await this.prisma.grammarPracticeAttempt.findUnique({ where });
        if (winner) return this.resolveReplay(studentId, grammarId, winner, answer);
      }
      throw err;
    }
    return this.withCounts(studentId, grammarId, correct);
  }

  /** Shared read-back: same answer ⇒ stored result; different answer ⇒ 409. */
  private async resolveReplay(
    studentId: string,
    grammarId: string,
    stored: { answer: unknown; correct: boolean },
    answer: string[],
  ) {
    if (JSON.stringify(stored.answer) !== JSON.stringify(answer)) {
      throw new AppException(
        ErrorCode.GRAMMAR_PRACTICE_CONFLICT,
        'Lượt nộp này đã được dùng cho một câu trả lời khác — hãy bắt đầu lượt mới',
      );
    }
    return this.withCounts(studentId, grammarId, stored.correct);
  }

  private async withCounts(studentId: string, grammarId: string, correct: boolean) {
    const [attempts, correctCount] = await Promise.all([
      this.prisma.grammarPracticeAttempt.count({ where: { userId: studentId, grammarId } }),
      this.prisma.grammarPracticeAttempt.count({
        where: { userId: studentId, grammarId, correct: true },
      }),
    ]);
    const { tokens } = await this.practiceSource(grammarId);
    return { id: grammarId, correct, expected: tokens, attemptCount: attempts, correctCount };
  }

  private async findDoc(
    grammarId: string,
  ): Promise<{ data: unknown } | null> {
    const revision = await this.currentRevision();
    if (revision === null) return null;
    return this.items.findOne({ revision, key: grammarId }).lean();
  }

  /** The grading source: valid tokens + prompt, or GRAMMAR_NOT_FOUND. */
  private async practiceSource(
    grammarId: string,
  ): Promise<{ tokens: string[]; vi: string }> {
    const doc = await this.findDoc(grammarId);
    const data = doc?.data as Record<string, unknown> | undefined;
    const tokens = data?.tokens;
    if (
      !data ||
      !Array.isArray(tokens) ||
      tokens.length === 0 ||
      !tokens.every((t): t is string => typeof t === 'string')
    ) {
      // No usable exercise source: to the caller this point has no practice.
      // Unknown ids and token-less rows share one code so a caller cannot
      // probe which ids exist but lack exercises.
      throw new AppException(
        ErrorCode.GRAMMAR_NOT_FOUND,
        'Không tìm thấy điểm ngữ pháp này',
      );
    }
    return { tokens, vi: String(data.vi ?? '') };
  }
}
