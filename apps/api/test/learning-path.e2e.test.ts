import "reflect-metadata";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { AppModule } from "../dist/src/app.module";
import { PrismaService } from "../dist/src/prisma/prisma.service";
import { GlobalExceptionFilter } from "../dist/src/common/filters/global-exception.filter";
import { EnvelopeInterceptor } from "../dist/src/common/interceptors/envelope.interceptor";
import { AppException } from "../dist/src/common/errors/app.exception";
import { ErrorCode } from "../dist/src/common/errors/error-codes";
import { extractVocabulary } from "../dist/src/flashcards/import/vocab-extract";
import { buildLearningCatalog } from "../dist/src/learning-path/learning-path.catalog";
import {
  gradeLearning,
  learningQuiz,
} from "../dist/src/learning-path/learning-path.rules";

const fixtureId = randomUUID().slice(0, 8);
const dbName = `hsk_lp_test_${fixtureId}`;
let app: INestApplication,
  prisma: PrismaService,
  mongo: Connection,
  base: string;
let originalMongo: string | undefined;
const userIds: string[] = [];
const prefix = "/student/learning-path";
const source = extractVocabulary(
  JSON.parse(readFileSync("content/writing.json", "utf8")),
);
const units = buildLearningCatalog(source.cards, "test-source");
const unit = { ...units[0], words: units[0].words.slice(0, 4) };
const unit2 = { ...unit, slug: "test-unit-2", order: 2 };
const passChoices = learningQuiz(unit).map(
  (q, i) => q.options.find((o) => o.text === unit.words[i].meaning)!.id,
);
// Each response shape is asserted in the lifecycle checks below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function req(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; data: any; body: any }> {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json();
  return { status: response.status, data: json.data, body: json };
}
before(async () => {
  originalMongo = process.env.MONGODB_URI;
  assert.ok(originalMongo, "MONGODB_URI is required");
  const authorityEnd = originalMongo.indexOf(
    "/",
    originalMongo.indexOf("://") + 3,
  );
  const queryStart = originalMongo.indexOf("?");
  const end =
    authorityEnd < 0
      ? queryStart < 0
        ? originalMongo.length
        : queryStart
      : authorityEnd;
  process.env.MONGODB_URI =
    originalMongo.slice(0, end) +
    "/" +
    dbName +
    (queryStart < 0 ? "" : originalMongo.slice(queryStart));
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: () =>
        new AppException(ErrorCode.VALIDATION_ERROR, "Invalid payload"),
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  await app.listen(0);
  base = (await app.getUrl()).replace("[::1]", "localhost") + "/api/v1";
  prisma = app.get(PrismaService);
  mongo = app.get<Connection>(getConnectionToken());
  await mongo
    .collection("learning_units")
    .insertMany([
      unit,
      unit2,
      ...Array.from({ length: 11 }, (_, i) => ({
        ...unit,
        slug: `test-unit-${i + 3}`,
        order: i + 3,
      })),
    ]);
  await mongo
    .collection("user_learning_progress")
    .createIndex({ userId: 1, unitSlug: 1 }, { unique: true });
});
after(async () => {
  if (prisma && userIds.length)
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (mongo && mongo.name === dbName && dbName.startsWith("hsk_lp_test_"))
    await mongo.dropDatabase();
  if (app) await app.close();
  if (originalMongo) process.env.MONGODB_URI = originalMongo;
});
describe("Learning catalog and scoring", () => {
  it("extracts audited real vocabulary into deterministic bounded immutable units", () => {
    assert.equal(source.cards.length, 1119);
    assert.equal(
      units.reduce((n, u) => n + u.words.length, 0),
      1119,
    );
    assert.deepEqual(units, buildLearningCatalog(source.cards, "test-source"));
    assert.ok(units.every((u) => u.words.length >= 2 && u.words.length <= 9));
    assert.equal(new Set(units.map((u) => u.slug)).size, units.length);
    assert.equal(new Set(units.map((u) => u.level)).size, 9);
  });
  it("deduplicates option meanings and uses the 80 percent server threshold", () => {
    const repeated = {
      slug: "repeated",
      words: [
        { hanzi: "一", pinyin: "yī", meaning: "one" },
        { hanzi: "壹", pinyin: "yī", meaning: "one" },
        { hanzi: "二", pinyin: "èr", meaning: "two" },
        { hanzi: "三", pinyin: "sān", meaning: "three" },
        { hanzi: "四", pinyin: "sì", meaning: "four" },
      ],
    };
    const quiz = learningQuiz(repeated);
    assert.equal(quiz[0].options.length, 4);
    const answers = quiz.map(
      (q, i) => q.options.find((o) => o.text === repeated.words[i].meaning)!.id,
    );
    answers[4] = "incorrect";
    assert.equal(gradeLearning(repeated, answers).passed, true);
    answers[3] = "incorrect";
    assert.equal(gradeLearning(repeated, answers).passed, false);
  });
});
for (let round = 1; round <= 3; round++) {
  it(`round ${round}: real API lifecycle, isolation, locks, reload and concurrent mutations`, async () => {
    // Dedicated users, clean Mongo catalog; never modifies any existing learner's progress.
    const password = "Password123!";
    const passwordHash = await bcrypt.hash(password, 4);
    const create = async (role: "student" | "teacher", tag: string) => {
      const user = await prisma.user.create({
        data: {
          email: `lp.${fixtureId}.${round}.${tag}@hsk.local`,
          passwordHash,
          role,
          status: "active",
          nickname: "LP test",
        },
      });
      userIds.push(user.id);
      const login = await req("POST", "/auth/login", undefined, {
        email: user.email,
        password,
      });
      assert.equal(login.status, 200, JSON.stringify(login.body));
      return { id: user.id, token: login.data.accessToken as string };
    };
    const a = await create("student", "a"),
      b = await create("student", "b"),
      t = await create("teacher", "t");
    assert.equal((await req("GET", prefix)).status, 401);
    assert.equal((await req("GET", prefix, t.token)).status, 403);
    assert.equal((await req("GET", prefix + "?level=0", a.token)).status, 400);
    assert.equal(
      (await req("GET", prefix + "?curriculum=unknown", a.token)).status,
      400,
    );
    const catalog = await req("GET", prefix, a.token);
    assert.equal(catalog.data.total, 13);
    assert.equal(catalog.data.units.length, 12);
    assert.equal(
      (await req("GET", prefix + "?page=2", a.token)).data.units.length,
      1,
    );
    assert.equal(
      (await req("GET", prefix + "?curriculum=hsk_standard_course", a.token))
        .data.total,
      0,
    );
    assert.equal(
      (await req("GET", prefix + "?level=9", a.token)).data.total,
      0,
    );
    assert.equal((await req("GET", prefix + "/absent", a.token)).status, 404);
    const locked = await req("GET", prefix + "/" + unit2.slug, a.token);
    assert.equal(locked.status, 403);
    assert.equal(locked.data, undefined);
    assert.equal(
      (await req("POST", prefix + "/" + unit2.slug + "/start", a.token)).status,
      403,
    );
    const path = prefix + "/" + unit.slug;
    assert.equal((await req("GET", path, a.token)).data.progress, null);
    assert.equal(
      await mongo
        .collection("user_learning_progress")
        .countDocuments({ userId: a.id }),
      0,
    );
    assert.equal(
      (await req("POST", path + "/start", a.token, { userId: b.id })).status,
      400,
    );
    const starts = await Promise.all([
      req("POST", path + "/start", a.token),
      req("POST", path + "/start", a.token),
    ]);
    assert.ok(starts.every((r) => r.status === 200));
    assert.equal(
      await mongo
        .collection("user_learning_progress")
        .countDocuments({ userId: a.id }),
      1,
    );
    let d = (await req("GET", path, a.token)).data;
    assert.equal(
      (
        await req("POST", path + "/study", a.token, {
          revision: d.progress.revision,
          index: 1,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await req("POST", path + "/complete", a.token, {
          revision: d.progress.revision,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await req("POST", path + "/answers", a.token, {
          revision: d.progress.revision,
          index: 0,
          choiceId: passChoices[0],
        })
      ).status,
      400,
    );
    const body = { revision: d.progress.revision, index: 0 };
    const race = await Promise.all([
      req("POST", path + "/study", a.token, body),
      req("POST", path + "/study", a.token, body),
    ]);
    assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
    d = (await req("GET", path, a.token)).data;
    assert.equal(d.progress.studyIndex, 1);
    for (let i = 1; i < unit.words.length; i++) {
      const r = await req("POST", path + "/study", a.token, {
        revision: d.progress.revision,
        index: i,
      });
      assert.equal(r.status, 200);
      d = r.data;
    }
    assert.equal(
      (
        await req("POST", path + "/answers", a.token, {
          revision: d.progress.revision,
          index: 0,
          choiceId: "invalid-choice00",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await req("POST", path + "/complete", a.token, {
          revision: d.progress.revision,
          score: 100,
          userId: b.id,
        })
      ).status,
      400,
    );
    for (let i = 0; i < unit.words.length; i++) {
      const wrong = d.quiz[i].options.find(
        (o: { id: string }) => o.id !== passChoices[i],
      ).id;
      const r = await req("POST", path + "/answers", a.token, {
        revision: d.progress.revision,
        index: i,
        choiceId: wrong,
      });
      assert.equal(r.status, 200);
      d = r.data;
    }
    let r = await req("POST", path + "/complete", a.token, {
      revision: d.progress.revision,
    });
    assert.equal(r.status, 200);
    d = r.data;
    assert.equal(d.result.passed, false);
    assert.equal(d.progress.status, "in_progress");
    assert.equal(d.result.score, 0);
    for (let i = 0; i < unit.words.length; i++) {
      r = await req("POST", path + "/answers", a.token, {
        revision: d.progress.revision,
        index: i,
        choiceId: passChoices[i],
      });
      assert.equal(r.status, 200);
      d = r.data;
    }
    d = (await req("GET", path, a.token)).data;
    assert.deepEqual(d.progress.answers, passChoices);
    const completions = await Promise.all(
      [1, 2].map(() =>
        req("POST", path + "/complete", a.token, {
          revision: d.progress.revision,
        }),
      ),
    );
    assert.deepEqual(completions.map((r) => r.status).sort(), [200, 409]);
    for (let i = 0; i < 3; i++) {
      d = (await req("GET", path, a.token)).data;
      assert.equal(d.progress.status, "completed");
      assert.equal(d.result.score, unit.words.length);
      assert.ok(d.progress.completedAt);
    }
    assert.equal(
      (await req("POST", path + "/start", a.token)).data.progress.status,
      "completed",
    );
    assert.equal(
      (
        await req("POST", path + "/answers", a.token, {
          revision: d.progress.revision,
          index: 0,
          choiceId: passChoices[0],
        })
      ).status,
      409,
    );
    assert.equal(
      (await req("GET", prefix + "/" + unit2.slug, a.token)).status,
      200,
    );
    assert.equal((await req("GET", path, b.token)).data.progress, null);
    assert.equal(
      (await req("GET", prefix + "/" + unit2.slug, b.token)).status,
      403,
    );
    assert.equal(
      (
        await req("POST", path + "/complete", b.token, {
          revision: d.progress.revision,
        })
      ).status,
      409,
    );
    assert.equal((await req("GET", prefix, a.token)).data.completed, 1);
    assert.equal((await req("GET", prefix, b.token)).data.completed, 0);
    assert.equal(await mongo.collection("flashcards").countDocuments({}), 0);
    assert.equal(
      await mongo.collection("user_flashcard_states").countDocuments({}),
      0,
    );
  });
}
