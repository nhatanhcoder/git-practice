import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import {
  toAuthUser,
  type AuthUser,
  type LoginResult,
  type RefreshResult,
  type RegisterResult,
} from './dto/auth-response.dto';

const BCRYPT_COST = 12; // INV-AUTH-01
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtAccessTtl: string;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    this.jwtAccessSecret = this.config.get<string>('JWT_ACCESS_SECRET') || '';
    if (!this.jwtAccessSecret) {
      throw new Error('JWT_ACCESS_SECRET is missing from environment');
    }
    this.jwtAccessTtl = this.config.get<string>('JWT_ACCESS_TTL') || '15m';
  }

  /**
   * Register a new user with status `pending`.
   * INV-AUTH-01: bcrypt cost 12.
   * INV-AUTH-03: status is always pending, admin role is forbidden.
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role as UserRole,
          status: 'pending',
          nickname: dto.fullName,
        },
      });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        nickname: user.nickname,
        createdAt: user.createdAt.toISOString(),
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException(ErrorCode.AUTH_EMAIL_EXISTS, 'Email đã được đăng ký');
      }
      throw err;
    }
  }

  /**
   * Login with email & password.
   * INV-AUTH-04: identical 401 for bad email and bad password.
   * INV-AUTH-05: pending -> 403, suspended -> 403.
   * Emits new session and returns raw refresh token for cookie.
   */
  async login(dto: LoginDto): Promise<{ result: LoginResult; rawRefreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Constant-time check mitigation if user not found
    if (!user) {
      await bcrypt.hash('dummy-password', BCRYPT_COST);
      throw new AppException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Email hoặc mật khẩu không chính xác',
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Email hoặc mật khẩu không chính xác',
      );
    }

    if (user.status === 'pending') {
      throw new AppException(
        ErrorCode.AUTH_ACCOUNT_PENDING,
        'Tài khoản đang chờ quản trị viên phê duyệt',
      );
    }

    if (user.status === 'suspended') {
      throw new AppException(
        ErrorCode.AUTH_ACCOUNT_SUSPENDED,
        'Tài khoản đã bị tạm khóa',
      );
    }

    const rawRefreshToken = generateRawToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const [accessToken] = await Promise.all([
      this.mintAccessToken(user.id, user.email, user.role),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      result: {
        accessToken,
        user: toAuthUser(user),
      },
      rawRefreshToken,
    };
  }

  /**
   * Rotate refresh token and detect replay attack.
   * INV-AUTH-06: single-use refresh token, rotated on every call.
   * INV-AUTH-07: replay attack revokes the entire token family immediately.
   */
  async refresh(rawToken: string | undefined): Promise<{ result: RefreshResult; newRawRefreshToken: string }> {
    if (!rawToken) {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, 'Thiếu refresh token');
    }

    const tokenHash = hashToken(rawToken);
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!token) {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, 'Refresh token không hợp lệ');
    }

    // Replay attack detection: token was already revoked!
    if (token.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: {
          familyId: token.familyId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: 'replay_attack',
        },
      });
      throw new AppException(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Phát hiện token đã qua sử dụng, phiên làm việc đã bị hủy',
      );
    }

    if (token.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date(), revokedReason: 'expired' },
      });
      throw new AppException(ErrorCode.AUTH_TOKEN_EXPIRED, 'Refresh token đã hết hạn');
    }

    if (token.user.status === 'suspended') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Tài khoản đã bị tạm khóa');
    }
    if (token.user.status === 'pending') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_PENDING, 'Tài khoản đang chờ phê duyệt');
    }

    const newRawRefreshToken = generateRawToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const [newRefreshToken, accessToken] = await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: token.userId,
          familyId: token.familyId, // Keep same family
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: token.id },
        data: {
          revokedAt: new Date(),
          revokedReason: 'rotated',
        },
      }),
    ]).then(async ([created]) => {
      // link replacedById
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { replacedById: created.id },
      });
      const tokenStr = await this.mintAccessToken(token.user.id, token.user.email, token.user.role);
      return [created, tokenStr] as const;
    });

    return {
      result: { accessToken },
      newRawRefreshToken,
    };
  }

  /**
   * Revoke current session on logout.
   */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
  }

  /**
   * Get authenticated user profile.
   */
  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Không tìm thấy người dùng');
    }
    return toAuthUser(user);
  }

  /**
   * Update profile fields (nickname, avatarUrl, bio).
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
      },
    });
    return toAuthUser(user);
  }

  /**
   * Change password: check current password, hash new password, revoke all active sessions.
   * INV-AUTH-08: password change revokes all active refresh tokens for the user.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'Không tìm thấy người dùng');
    }

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Mật khẩu hiện tại không chính xác',
        { currentPassword: ['Mật khẩu hiện tại không đúng'] },
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, BCRYPT_COST);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_change' },
      }),
    ]);
  }

  private mintAccessToken(userId: string, email: string, role: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email, role },
      { expiresIn: this.jwtAccessTtl },
    );
  }
}
