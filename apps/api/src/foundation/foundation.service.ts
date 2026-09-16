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
  FOUNDATION_GROUPS,
  FoundationItem,
  type FoundationItemDocument,
} from '../mongodb/schemas/foundation-item.schema';
import {
  GROUPS_BY_KIND,
  foundationProgressKey,
  isFoundationKind,
  type FoundationKind,
} from './foundation-rules';
import type { SetFoundationProgressDto } from './dto/foundation.dto';

/**
 * Foundation catalog + studied-state (02-foundation-grammar.md).
 * Actor-scoped end to end: no method takes a studentId from the wire — the
 * controller passes the token subject only.
 *
 * Catalog reads pin one imported revision (the latest `content_revisions` row
 * for `foundation`); progress writes are single-row PG upserts keyed
 * (userId, 'foundation', '<kind>:<key>'). The two stores never share a
 * transaction (DEBT-001): a save first verifies the key against the pinned
 * catalog, then writes PG — a key vanishing mid-flight fails the write, it
 * does not resurrect catalog data.
 */
@Injectable()
export class FoundationService {
  constructor(
    @InjectModel(FoundationItem.name)
    private readonly items: Model<FoundationItemDocument>,
    @InjectModel(ContentRevision.name)
    private readonly revisions: Model<ContentRevisionDocument>,
    private readonly prisma: PrismaService,
  ) {}

  /** Latest published revision, or null when nothing was ever imported. */
  async currentRevision(): Promise<string | null> {
    const row = await this.revisions
      .findOne({ name: 'foundation' })
      .sort({ importedAt: -1, _id: -1 })
      .select({ revision: 1 })
      .lean();
    return row?.revision ?? null;
  }

  /**
   * The whole catalog in one response — the hub renders five tabs off one
   * load (297 records, ~90 KB). `revision: null` with empty groups means no
   * import has ever run: an honest empty, not an error.
   */
  async getCatalog(): Promise<{
    revision: string | null;
    groups: Record<string, unknown[]>;
  }> {
    const revision = await this.currentRevision();
    const groups: Record<string, unknown[]> = {};
    for (const group of FOUNDATION_GROUPS) groups[group] = [];
    if (!revision) return { revision, groups };
    const docs = await this.items
      .find({ revision })
      .select({ group: 1, data: 1 })
      .lean();
    for (const doc of docs) {
      const bucket = groups[doc.group];
      if (Array.isArray(bucket)) bucket.push(doc.data);
    }
    return { revision, groups };
  }

  async getProgress(studentId: string): Promise<{
    studied: Array<{ kind: string; key: string; studied: boolean; updatedAt: string }>;
  }> {
    const rows = await this.prisma.userStudyProgress.findMany({
      where: { userId: studentId, contentKind: 'foundation' },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      studied: rows.map((r) => {
        const sep = r.contentKey.indexOf(':');
        return {
          kind: r.contentKey.slice(0, sep),
          key: r.contentKey.slice(sep + 1),
          studied: r.studied,
          updatedAt: r.updatedAt.toISOString(),
        };
      }),
    };
  }

  /**
   * Explicit idempotent SET (D3, INV rule 7): the same body twice is a
   * no-op by construction. Marking a key the pinned catalog does not carry
   * is the caller's bug → VALIDATION_ERROR, never a silent accept.
   */
  async setProgress(studentId: string, dto: SetFoundationProgressDto) {
    if (!isFoundationKind(dto.kind)) {
      // Unreachable through the DTO's @IsIn, but the service owns the rule —
      // a caller that bypasses validation still gets the same answer.
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ');
    }
    const kind = dto.kind as FoundationKind;
    const revision = await this.currentRevision();
    const known =
      revision !== null &&
      (await this.items.exists({
        revision,
        group: { $in: [...GROUPS_BY_KIND[kind]] },
        key: dto.key,
      })) !== null;
    if (!known) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Nội dung không tồn tại trong phiên bản hiện tại',
      );
    }
    const row = await this.prisma.userStudyProgress.upsert({
      where: {
        userId_contentKind_contentKey: {
          userId: studentId,
          contentKind: 'foundation',
          contentKey: foundationProgressKey(kind, dto.key),
        },
      },
      create: {
        userId: studentId,
        contentKind: 'foundation',
        contentKey: foundationProgressKey(kind, dto.key),
        studied: dto.studied,
      },
      update: { studied: dto.studied },
    });
    return {
      kind,
      key: dto.key,
      studied: row.studied,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
