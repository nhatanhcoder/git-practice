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

interface RotationCacheEntry {
  accessToken: string;
  rawRefreshToken: string;
  expiresAt: number;
}

interface LoginRateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
}

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtAccessTtl: string;
  private readonly rotationCache = new Map<string, RotationCacheEntry>();
  private readonly loginAttempts = new Map<string, LoginRateLimitEntry>();
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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

  private checkLoginRateLimit(ip: string, email: string): void {
    const key = `${ip}:${email.toLowerCase().trim()}`;
    const now = Date.now();
    const entry = this.loginAttempts.get(key);
    if (!entry) return;

    if (now - entry.firstAttemptAt > AuthService.LOGIN_WINDOW_MS) {
      this.loginAttempts.delete(key);
      return;
    }

    if (entry.attempts >= AuthService.MAX_LOGIN_ATTEMPTS) {
      throw new AppException(
        ErrorCode.AUTH_TOO_MANY_REQUESTS,
        'Quá nhiều lần thử đăng nhập không thành công, vui lòng thử lại sau 15 phút',
      );
    }
  }

  private recordFailedLogin(ip: string, email: string): void {
    const key = `${ip}:${email.toLowerCase().trim()}`;
    const now = Date.now();
    const entry = this.loginAttempts.get(key);

    if (!entry || now - entry.firstAttemptAt > AuthService.LOGIN_WINDOW_MS) {
      this.loginAttempts.set(key, { attempts: 1, firstAttemptAt: now });
    } else {
      entry.attempts += 1;
    }
  }

  private clearFailedLogins(ip: string, email: string): void {
    const key = `${ip}:${email.toLowerCase().trim()}`;
    this.loginAttempts.delete(key);
  }

  /**
   * Register a new user. Students are created in 'pending' status (INV-AUTH-03).
   * Password hashed with bcrypt cost 12 (INV-AUTH-01).
   */
  async register(dto: RegisterDto): Promise<RegisterResult> {
    if ((dto.role as string) === 'admin') {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Không thể tự đăng ký tài khoản với quyền admin',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          nickname: dto.fullName,
          role: dto.role ?? 'student',
          status: 'pending',
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
        throw new AppException(
          ErrorCode.AUTH_EMAIL_EXISTS,
          'Email này đã được sử dụng',
        );
      }
      throw err;
    }
  }

  /**
   * Login with email & password.
   * INV-AUTH-04: constant-time comparison, unified error message.
   * INV-AUTH-05: pending/suspended accounts rejected after password verification.
   * INV-AUTH-06: mints access token and writes refresh token hash to DB.
   * Rate limiting: max 5 failures per 15 minutes per (ip, email).
   */
  async login(dto: LoginDto, ip = '127.0.0.1'): Promise<{ result: LoginResult; rawRefreshToken: string }> {
    this.checkLoginRateLimit(ip, dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Constant-time check mitigation if user not found
    if (!user) {
      await bcrypt.hash('dummy-password', BCRYPT_COST);
      this.recordFailedLogin(ip, dto.email);
      throw new AppException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Email hoặc mật khẩu không chính xác',
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      this.recordFailedLogin(ip, dto.email);
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

    this.clearFailedLogins(ip, dto.email);

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
   * Handle re-presentation of an already-revoked refresh token.
   * Checks grace window for benign concurrent races (e.g. multi-tab burst),
   * restores child token cookie via rotationCache (01-auth.md §8 Proposal A),
   * otherwise revokes the entire family for replay attack.
   */
  private async handleRevokedToken(
    token: any,
    tokenHash: string,
  ): Promise<{ result: RefreshResult; newRawRefreshToken: string }> {
    // Expiry and user status must NOT be bypassed by the grace branch (01-auth.md §8, INV-AUTH-05/10)
    if (token.expiresAt < new Date()) {
      throw new AppException(ErrorCode.AUTH_TOKEN_EXPIRED, 'Refresh token đã hết hạn');
    }
    if (token.user.status === 'suspended') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Tài khoản đã bị tạm khóa');
    }
    if (token.user.status === 'pending') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_PENDING, 'Tài khoản đang chờ phê duyệt');
    }

    const isRotated = token.revokedReason === 'rotated';
    const withinGrace =
      token.revokedAt && Date.now() - new Date(token.revokedAt).getTime() <= 15_000;

    if (isRotated && withinGrace && token.replacedById) {
      const child = await this.prisma.refreshToken.findUnique({
        where: { id: token.replacedById },
        include: { user: true },
      });
      if (child && !child.revokedAt && child.expiresAt > new Date()) {
        if (child.user.status === 'suspended') {
          throw new AppException(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Tài khoản đã bị tạm khóa');
        }
        if (child.user.status === 'pending') {
          throw new AppException(ErrorCode.AUTH_ACCOUNT_PENDING, 'Tài khoản đang chờ phê duyệt');
        }

        // Return cached rotation result (includes new raw refresh token cookie for lost response recovery)
        const cached = this.rotationCache.get(tokenHash);
        if (cached && cached.expiresAt > Date.now()) {
          return {
            result: { accessToken: cached.accessToken },
            newRawRefreshToken: cached.rawRefreshToken,
          };
        }

        // Fallback if cache expired
        const accessToken = await this.mintAccessToken(child.user.id, child.user.email, child.user.role);
        return {
          result: { accessToken },
          newRawRefreshToken: '',
        };
      }
    }

    // Replay attack: revoke the entire family immediately
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
      ErrorCode.AUTH_REFRESH_INVALID,
      'Phát hiện token đã qua sử dụng, phiên làm việc đã bị hủy',
    );
  }

  /**
   * Rotate refresh token and detect replay attack.
   * INV-AUTH-06: single-use refresh token, rotated on every call.
   * INV-AUTH-07: replay attack revokes the entire token family immediately.
   * INV-AUTH-10: atomic rotation, parent revoked and replacedById set in same transaction.
   */
  async refresh(rawToken: string | undefined): Promise<{ result: RefreshResult; newRawRefreshToken: string }> {
    if (!rawToken) {
      throw new AppException(ErrorCode.AUTH_REFRESH_INVALID, 'Thiếu refresh token');
    }

    const tokenHash = hashToken(rawToken);
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!token) {
      throw new AppException(ErrorCode.AUTH_REFRESH_INVALID, 'Refresh token không hợp lệ');
    }

    // Invariant: expired tokens can never be refreshed, even within grace window (01-auth.md §8)
    if (token.expiresAt < new Date()) {
      if (!token.revokedAt) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date(), revokedReason: 'expired' },
        });
      }
      throw new AppException(ErrorCode.AUTH_TOKEN_EXPIRED, 'Refresh token đã hết hạn');
    }

    // Invariant: suspended or pending account is rejected before any token emission (INV-AUTH-05)
    if (token.user.status === 'suspended') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Tài khoản đã bị tạm khóa');
    }
    if (token.user.status === 'pending') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_PENDING, 'Tài khoản đang chờ phê duyệt');
    }

    // If token was already revoked, enter grace window vs replay check
    if (token.revokedAt) {
      return this.handleRevokedToken(token, tokenHash);
    }

    const newRawRefreshToken = generateRawToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    try {
      const accessToken = await this.prisma.$transaction(async (tx) => {
        // 1. Create child token
        const created = await tx.refreshToken.create({
          data: {
            userId: token.userId,
            familyId: token.familyId,
            tokenHash: newTokenHash,
            expiresAt: newExpiresAt,
          },
        });

        // 2. Conditionally update parent: only if still unrevoked!
        const updated = await tx.refreshToken.updateMany({
          where: { id: token.id, revokedAt: null },
          data: {
            revokedAt: new Date(),
            revokedReason: 'rotated',
            replacedById: created.id,
          },
        });

        if (updated.count === 0) {
          // A concurrent request beat us to rotating this token
          throw new Error('CONCURRENT_ROTATION');
        }

        return this.mintAccessToken(token.user.id, token.user.email, token.user.role);
      });

      // Cache rotation result for 15s to serve concurrent races and restore lost cookies (01-auth.md §8 Option A)
      this.rotationCache.set(tokenHash, {
        accessToken,
        rawRefreshToken: newRawRefreshToken,
        expiresAt: Date.now() + 15_000,
      });

      return {
        result: { accessToken },
        newRawRefreshToken,
      };
    } catch (err: any) {
      if (err?.message === 'CONCURRENT_ROTATION') {
        const reloaded = await this.prisma.refreshToken.findUnique({
          where: { id: token.id },
          include: { user: true },
        });
        if (reloaded) {
          return this.handleRevokedToken(reloaded, tokenHash);
        }
      }
      throw err;
    }
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
