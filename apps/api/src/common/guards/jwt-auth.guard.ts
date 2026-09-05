import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';

type AccessTokenClaims = { sub: string; email?: string; role?: string };

/**
 * Verifies the access token and attaches the caller's **current** database row.
 *
 * The status comes from the database on every request, not from the token, because
 * `01-auth.md` §5 requires exactly that: a token minted before an admin suspended the
 * account must stop working immediately, and a claim baked in at login cannot express
 * that. The spec notes a cache would make the invariant true only after the TTL —
 * that trade is unresolved (§16), so the straightforward read stands. It is one
 * primary-key lookup.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, 'Thiếu hoặc sai định dạng access token');
    }

    let claims: AccessTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessTokenClaims>(token);
    } catch (e) {
      // Distinguishing expiry from malformed matters to the frontend: expired means
      // "try the refresh flow", invalid means "log out". Same 401 either way.
      const expired = e instanceof Error && e.name === 'TokenExpiredError';
      throw new AppException(
        expired ? ErrorCode.AUTH_TOKEN_EXPIRED : ErrorCode.AUTH_TOKEN_INVALID,
        expired ? 'Access token đã hết hạn' : 'Access token không hợp lệ',
      );
    }

    const user = claims.sub
      ? await this.prisma.user.findUnique({
          where: { id: claims.sub },
          // Explicit select: passwordHash must never be loaded into a request-scoped
          // object that later gets logged or serialised (INV-USERS-02).
          select: { id: true, email: true, role: true, status: true },
        })
      : null;

    if (!user) {
      // The subject no longer exists. Not USER_NOT_FOUND — that is about the resource
      // being addressed, not about who is asking.
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, 'Access token không hợp lệ');
    }

    if (user.status === 'suspended') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Tài khoản đã bị khoá');
    }
    if (user.status === 'pending') {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_PENDING, 'Tài khoản đang chờ duyệt');
    }

    (req as Request & { user: typeof user }).user = user;
    return true;
  }
}
