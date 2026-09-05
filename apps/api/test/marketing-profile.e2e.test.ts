import 'reflect-metadata';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../dist/src/app.module';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';
import { EnvelopeInterceptor } from '../dist/src/common/interceptors/envelope.interceptor';
import { AppException } from '../dist/src/common/errors/app.exception';
import { ErrorCode } from '../dist/src/common/errors/error-codes';
import { PrismaService } from '../dist/src/prisma/prisma.service';
import {
  CONSENT_VERSION,
  requiresGuardianConsent,
  resolveConsent,
} from '../dist/src/auth/marketing-rules';

const PREFIX = 'api/v1';

let app: INestApplication;
let base: string;
let prisma: PrismaService;

// Own fixtures, torn down at the end — API-012 records what happens when a suite leans on a
// seeded row's state instead.
const STUDENT_EMAIL = 'test.mkt.student@hsk.local';
const OTHER_EMAIL = 'test.mkt.other@hsk.local';
const OWNED = [STUDENT_EMAIL, OTHER_EMAIL];

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

async function req(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: any,
  token?: string,
) {
  const headers: Record<string, string> = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers['authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}/${PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let adminToken: string;
let studentToken: string;
let otherToken: string;
let studentId: string;

async function registerApproveLogin(email: string, fullName: string) {
  const reg = await req('POST', '/auth/register', {
    email,
    password: 'Password123!',
    fullName,
    role: 'student',
  });
  assert.equal(reg.status, 201, `register ${email}: ${JSON.stringify(reg.body)}`);
  await req('PATCH', `/admin/users/${reg.body.data.id}/approve`, undefined, adminToken);
  const login = await req('POST', '/auth/login', { email, password: 'Password123!' });
  assert.equal(login.status, 200, `login ${email}: ${JSON.stringify(login.body)}`);
  return { id: reg.body.data.id, token: login.body.data.accessToken };
}

before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(PREFIX);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(ErrorCode.VALIDATION_ERROR, 'Dữ liệu không hợp lệ', toDetails(errors)),
    }),
  );
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost');
  prisma = app.get(PrismaService);

  await prisma.user.deleteMany({ where: { email: { in: OWNED } } });

  const adminLogin = await req('POST', '/auth/login', {
    email: 'admin@hsk.local',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.accessToken;

  const a = await registerApproveLogin(STUDENT_EMAIL, 'Học Viên Marketing');
  studentId = a.id;
  studentToken = a.token;
  otherToken = (await registerApproveLogin(OTHER_EMAIL, 'Học Viên Khác')).token;
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: OWNED } } });
  await app?.close();
});

describe('Consent rules (pure)', () => {
  const now = new Date('2026-09-05T00:00:00Z');

  it('treats an adult birth year as able to consent for themselves', () => {
    assert.equal(requiresGuardianConsent(2000, now), false);
  });

  it('flags a birth year that puts the person under 16', () => {
    assert.equal(requiresGuardianConsent(2015, now), true);
  });

  it('treats exactly 16 as old enough', () => {
    assert.equal(requiresGuardianConsent(2010, now), false);
  });

  it('does not flag a missing birth year', () => {
    assert.equal(requiresGuardianConsent(null, now), false);
    assert.equal(requiresGuardianConsent(undefined, now), false);
  });

  it('stamps version and timestamp when consent is granted', () => {
    const r = resolveConsent({ marketingConsent: true, birthYear: 2000 }, null, now);
    assert.equal(r.marketingConsent, true);
    assert.equal(r.consentVersion, CONSENT_VERSION);
    assert.deepEqual(r.consentedAt, now);
    assert.equal(r.withdrawnAt, null);
    assert.deepEqual(r.consentChannels, ['email']);
  });

  it('keeps the original consentedAt when consent is re-sent', () => {
    const first = new Date('2026-01-01T00:00:00Z');
    const r = resolveConsent(
      { marketingConsent: true, birthYear: 2000 },
      { marketingConsent: true, consentedAt: first, consentChannels: ['zalo'] },
      now,
    );
    assert.deepEqual(r.consentedAt, first, 'saving the profile again moved the consent date');
  });

  it('clears the channels and stamps withdrawnAt on withdrawal', () => {
    const r = resolveConsent(
      { marketingConsent: false, birthYear: 2000 },
      { marketingConsent: true, consentChannels: ['email', 'zalo'], consentedAt: now },
      now,
    );
    assert.equal(r.marketingConsent, false);
    assert.deepEqual(r.consentChannels, [], 'channels survived a withdrawal');
    assert.deepEqual(r.withdrawnAt, now);
  });

  it('leaves consent untouched when the request does not mention it', () => {
    const r = resolveConsent(
      { birthYear: 2000 },
      { marketingConsent: true, consentChannels: ['sms'], consentedAt: now },
      now,
    );
    assert.equal(r.marketingConsent, true);
    assert.deepEqual(r.consentChannels, ['sms']);
  });

  it('refuses self-consent from a minor and marks the row', () => {
    const r = resolveConsent({ marketingConsent: true, birthYear: 2015 }, null, now);
    assert.equal(r.marketingConsent, false, 'a minor consented for themselves');
    assert.equal(r.guardianConsentRequired, true);
    assert.deepEqual(r.consentChannels, []);
  });
});

describe('Marketing profile API', () => {
  it('answers with exists=false before anything has been filled in', async () => {
    const res = await req('GET', '/auth/me/marketing', undefined, studentToken);
    assert.equal(res.status, 200);
    // An object, never a bare null: the envelope passes null through untouched, so a null
    // return would arrive as an empty 200 body that a client cannot distinguish from a
    // truncated response.
    assert.equal(res.body.data.exists, false);
    assert.equal(res.body.data.marketingConsent, false);
  });

  it('rejects an anonymous request', async () => {
    const res = await req('GET', '/auth/me/marketing');
    assert.equal(res.status, 401);
  });

  it('saves a profile with consent and stamps the consent record', async () => {
    const res = await req(
      'PATCH',
      '/auth/me/marketing',
      {
        birthYear: 1998,
        gender: 'female',
        province: 'Hà Nội',
        phone: '0912 345 678',
        occupation: 'office_worker',
        learningGoal: 'work',
        currentLevel: 3,
        referralSource: 'facebook',
        utmSource: 'fb',
        utmMedium: 'cpc',
        utmCampaign: 'hsk4-thang9',
        marketingConsent: true,
        consentChannels: ['email', 'zalo'],
      },
      studentToken,
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.marketingConsent, true);
    assert.equal(res.body.data.consentVersion, CONSENT_VERSION);
    assert.ok(res.body.data.consentedAt);
    assert.equal(res.body.data.phone, '0912345678', 'phone was not normalised');
    assert.deepEqual(res.body.data.consentChannels, ['email', 'zalo']);
    assert.equal(res.body.data.guardianConsentRequired, false);
  });

  it('rejects a malformed phone rather than storing it', async () => {
    const res = await req('PATCH', '/auth/me/marketing', { phone: '12345' }, studentToken);
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('rejects a birth year in the future', async () => {
    const res = await req(
      'PATCH',
      '/auth/me/marketing',
      { birthYear: new Date().getUTCFullYear() + 1 },
      studentToken,
    );
    assert.equal(res.status, 400);
  });

  it('rejects an unknown learning goal', async () => {
    const res = await req('PATCH', '/auth/me/marketing', { learningGoal: 'crypto' }, studentToken);
    assert.equal(res.status, 400);
  });

  it('does not erase other answers when one field is saved', async () => {
    const res = await req('PATCH', '/auth/me/marketing', { currentLevel: 4 }, studentToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.currentLevel, 4);
    assert.equal(res.body.data.province, 'Hà Nội', 'a single-field save wiped province');
    assert.equal(res.body.data.gender, 'female', 'a single-field save wiped gender');
    assert.equal(res.body.data.marketingConsent, true, 'a single-field save changed consent');
  });

  it('never returns another account profile', async () => {
    const res = await req('GET', '/auth/me/marketing', undefined, otherToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.exists, false, 'a second account saw the first account profile');
    assert.equal(res.body.data.phone, null);
  });

  it('refuses self-consent from a minor and keeps the flag on the row', async () => {
    const res = await req(
      'PATCH',
      '/auth/me/marketing',
      { birthYear: new Date().getUTCFullYear() - 12, marketingConsent: true },
      otherToken,
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.marketingConsent, false, 'a 12-year-old consented to advertising');
    assert.equal(res.body.data.guardianConsentRequired, true);
    assert.deepEqual(res.body.data.consentChannels, []);
  });

  it('deletes the data on withdrawal and keeps the account', async () => {
    const res = await req('DELETE', '/auth/me/marketing', undefined, studentToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.deleted, true);

    const gone = await prisma.userMarketingProfile.findUnique({ where: { userId: studentId } });
    assert.equal(gone, null, 'withdrawal left the collected data in the table');

    const stillThere = await prisma.user.findUnique({ where: { id: studentId } });
    assert.ok(stillThere, 'withdrawing consent deleted the account');

    const me = await req('GET', '/auth/me', undefined, studentToken);
    assert.equal(me.status, 200, 'the session broke after withdrawal');
  });

  it('reports deleted=false when there was nothing to delete', async () => {
    const res = await req('DELETE', '/auth/me/marketing', undefined, studentToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.deleted, false);
  });
});

describe('Registration carrying a marketing block', () => {
  const EMAIL = 'test.mkt.signup@hsk.local';
  const MINOR_EMAIL = 'test.mkt.minor@hsk.local';

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [EMAIL, MINOR_EMAIL] } } });
  });

  it('stores the profile submitted with the registration', async () => {
    const res = await req('POST', '/auth/register', {
      email: EMAIL,
      password: 'Password123!',
      fullName: 'Nguoi Dang Ky',
      role: 'student',
      marketing: {
        birthYear: 1995,
        learningGoal: 'study_abroad',
        province: 'Da Nang',
        marketingConsent: true,
        consentChannels: ['zalo'],
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'pending');

    const row = await prisma.userMarketingProfile.findUnique({
      where: { userId: res.body.data.id },
    });
    assert.ok(row, 'the marketing block submitted at signup was not stored');
    assert.equal(row!.learningGoal, 'study_abroad');
    assert.equal(row!.marketingConsent, true);
    assert.deepEqual(row!.consentChannels, ['zalo']);
    assert.ok(row!.consentedAt);
  });

  it('refuses a minor self-consenting at signup but still creates the account', async () => {
    const res = await req('POST', '/auth/register', {
      email: MINOR_EMAIL,
      password: 'Password123!',
      fullName: 'Hoc Sinh Nho',
      role: 'student',
      marketing: {
        birthYear: new Date().getUTCFullYear() - 11,
        marketingConsent: true,
        consentChannels: ['email'],
      },
    });
    assert.equal(res.status, 201);

    const row = await prisma.userMarketingProfile.findUnique({
      where: { userId: res.body.data.id },
    });
    assert.equal(row!.marketingConsent, false, 'an 11-year-old consented to advertising at signup');
    assert.equal(row!.guardianConsentRequired, true);
    assert.deepEqual(row!.consentChannels, []);
  });

  it('rejects a malformed marketing block rather than creating a half account', async () => {
    const before = await prisma.user.count();
    const res = await req('POST', '/auth/register', {
      email: 'test.mkt.bad@hsk.local',
      password: 'Password123!',
      fullName: 'Khong Hop Le',
      role: 'student',
      marketing: { phone: 'khong-phai-so' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.equal(await prisma.user.count(), before, 'a rejected registration still created a user');
  });
});
