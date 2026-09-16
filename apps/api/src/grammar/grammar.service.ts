import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import { compareGrammar } from './grammar-rules';
import type { ListGrammarQueryDto } from './dto/grammar.dto';

/**
 * Grammar catalog + studied-state (02-foundation-grammar.md).
 * Same scoping and no-cross-DB-transaction rules as FoundationService.
 *
 * The catalog is 76 records: the list reads the whole pinned revision and
 * filters/sorts/paginates in memory. That is deliberate, not lazy — a Mongo
 * query over `data.*` Mixed fields cannot express "search name/hanzi/pinyin/
 * vi uniformly" without an index it cannot use, while the in-memory path is
 * exactly the stable order §2 mandates (level asc, id asc). Revisit only if
 * the corpus grows past the low hundreds.
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
    const q = (query.search ?? '').trim().toLowerCase();
    const filtered = docs.filter((d) => {
      if (query.hskLevel !== undefined && d.level !== query.hskLevel) return false;
      if (query.category !== undefined && d.category !== query.category) return false;
      if (!q) return true;
      const data = d.data as Record<string, unknown>;
      return ['name', 'hanzi', 'pinyin', 'vi', 'formula', 'key'].some((f) =>
        String(data[f] ?? '').toLowerCase().includes(q),
      );
    });
    filtered.sort((a, b) => compareGrammar(a, b));
    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const slice = filtered.slice((page - 1) * limit, page * limit);
    return {
      data: slice.map((d) => d.data),
      meta: { total, page, limit, totalPages },
    };
  }

  async getOne(id: string) {
    const revision = await this.currentRevision();
    const doc =
      revision === null
        ? null
        : await this.items.findOne({ revision, key: id }).lean();
    if (!doc) {
      throw new AppException(
        ErrorCode.GRAMMAR_NOT_FOUND,
        'Không tìm thấy điểm ngữ pháp này',
      );
    }
    return doc.data;
  }

  async getProgress(studentId: string): Promise<{
    studied: Array<{ grammarId: string; studied: boolean; updatedAt: string }>;
  }> {
    const rows = await this.prisma.userStudyProgress.findMany({
      where: { userId: studentId, contentKind: 'grammar' },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      studied: rows.map((r) => ({
        grammarId: r.contentKey,
        studied: r.studied,
        updatedAt: r.updatedAt.toISOString(),
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
}
