import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import {
  DETAIL_SELECT,
  LIST_SELECT,
  toDetail,
  toListItem,
  type AdminUserDetail,
  type AdminUserListItem,
} from './dto/admin-user.dto';
import type { ListUsersQuery } from './dto/list-users.query';

export type ListUsersResult = {
  data: AdminUserListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

/** Matches the uuid shape Prisma's `@db.Uuid` column accepts. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * `02-users.md` §3 / INV-USERS-03, 05, 06, 07.
   *
   * Count and page are one transaction so `meta.total` cannot describe a different
   * set than `data` when rows are written between the two queries.
   */
  async list(query: ListUsersQuery): Promise<ListUsersResult> {
    const where = this.buildWhere(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const order = query.order ?? 'desc';

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where: Object.keys(where).length ? where : undefined }),
      this.prisma.user.findMany({
        where: Object.keys(where).length ? where : undefined,
        select: LIST_SELECT,
        orderBy: [{ [sortBy]: order }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map(toListItem),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** `02-users.md` §3 / INV-USERS-17: a missing id is always 404, never an empty 200. */
  async findById(id: string): Promise<AdminUserDetail> {
    if (!UUID.test(id)) {
      // Reject the malformed id before it reaches Postgres: an invalid uuid literal
      // raises a driver error that would surface as a 500 for what is a client mistake.
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', {
        id: ['id phải là uuid hợp lệ'],
      });
    }

    const row = await this.prisma.user.findUnique({ where: { id }, select: DETAIL_SELECT });
    if (!row) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Không tìm thấy người dùng');
    }
    return toDetail(row);
  }

  async approve(id: string): Promise<AdminUserDetail> {
    if (!UUID.test(id)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Không tìm thấy người dùng');
    }
    if (user.status === 'active') {
      throw new AppException(ErrorCode.USER_ALREADY_APPROVED, 'Tài khoản đã được phê duyệt trước đó');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'active' },
      select: DETAIL_SELECT,
    });
    return toDetail(updated);
  }

  async suspend(id: string): Promise<AdminUserDetail> {
    if (!UUID.test(id)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Không tìm thấy người dùng');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'suspended' },
      select: DETAIL_SELECT,
    });
    return toDetail(updated);
  }

  async activate(id: string): Promise<AdminUserDetail> {
    if (!UUID.test(id)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'id không đúng định dạng uuid');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Không tìm thấy người dùng');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'active' },
      select: DETAIL_SELECT,
    });
    return toDetail(updated);
  }

  private buildWhere(query: ListUsersQuery): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;

    if (query.q) {
      // `email` is citext, so its comparison is case-insensitive in the database;
      // `nickname` is varchar and needs the explicit mode. Spelling both out rather
      // than relying on the column type keeps the invariant readable at the call site.
      where.OR = [
        { nickname: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}

