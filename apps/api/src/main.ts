import 'reflect-metadata';
import { Logger, ValidationPipe, type ValidationError } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { AppException } from './common/errors/app.exception';
import { ErrorCode } from './common/errors/error-codes';

/**
 * Flattens class-validator's tree into `Record<field, string[]>`, the shape
 * `API_ERROR_CODES.md` §4 mandates for `details`. Nested objects are joined with a
 * dot so the frontend can address `address.city` the same way it addresses `email`.
 */
function toDetails(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const err of errors) {
    const field = prefix ? `${prefix}.${err.property}` : err.property;
    const messages = Object.values(err.constraints ?? {});
    if (messages.length) out[field] = [...(out[field] ?? []), ...messages];
    if (err.children?.length) Object.assign(out, toDetails(err.children, field));
  }
  return out;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // `/api/v1`, per API_CONVENTIONS.md § Base URL and § Versioning, and matching every
  // path written in docs/api/**. It used to be hardcoded to 'api' while .env declared
  // API_PREFIX="api/v1" and NEXT_PUBLIC_API_URL pointed at /api/v1 — the first real
  // frontend call would have 404'd (KNOWN_ISSUES API-008, settled by the owner).
  const prefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(prefix);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Without this the pipe throws Nest's own BadRequestException, whose body has no
      // `code` and whose `message` is an array — neither matches the envelope.
      exceptionFactory: (errors) =>
        new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', toDetails(errors)),
    }),
  );
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true });

  const swagger = new DocumentBuilder()
    .setTitle('HSK Learning Platform API')
    .setDescription('Admin surface. Only the modules whose specs are unblocked are implemented.')
    .setVersion('1')
    .addBearerAuth()
    .build();
  // Mounted at <prefix>/docs, not at <prefix> itself: the prefix root is where the
  // API lives, and serving an HTML UI from the same path as the resource tree invites
  // exactly the sort of collision that is painful to debug later.
  SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);

  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/${prefix}`);
}

void bootstrap();
