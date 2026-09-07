import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  formatClassJoinedDate,
  isValidUuid,
  resolveClassDetailOutcome,
  resolveLessonDetailOutcome,
} from "../src/lib/student/classes-rules.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

const mockDetail = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  name: "Lớp HSK 3 - Cấp tốc K42",
  hskLevel: 3,
  status: "active",
  description: "Lớp học chuẩn bị thi HSK 3",
  createdAt: "2026-08-01T08:00:00.000Z",
  teacher: {
    id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    nickname: "Thầy Trương",
    email: "truong@example.com",
    avatarUrl: null,
  },
  lessons: [
    {
      id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      title: "Bài 1: Làm quen",
      description: "Từ vựng cơ bản",
      contentType: "video",
      contentUrl: null,
      orderIndex: 0,
      createdAt: "2026-08-02T08:00:00.000Z",
    },
  ],
  studentCount: 15,
  joinedAt: "2026-08-05T10:30:00.000Z",
  rejoinedAt: null,
};

describe("A08 · UUID Validation", () => {
  it("accepts valid v4 UUIDs (lower and uppercase)", () => {
    assert.equal(isValidUuid("3fa85f64-5717-4562-b3fc-2c963f66afa6"), true);
    assert.equal(isValidUuid("3FA85F64-5717-4562-B3FC-2C963F66AFA6"), true);
  });

  it("rejects non-UUID strings", () => {
    assert.equal(isValidUuid(""), false);
    assert.equal(isValidUuid("cls-1"), false);
    assert.equal(isValidUuid("12345"), false);
    assert.equal(isValidUuid("3fa85f64-5717-4562-b3fc"), false);
    assert.equal(isValidUuid("not-a-uuid-at-all-1234567890"), false);
  });
});

describe("A08 · Class Detail Outcome Resolution", () => {
  it("resolves invalid_id when validId is false", () => {
    assert.equal(resolveClassDetailOutcome(false, null, null, false), "invalid_id");
    assert.equal(resolveClassDetailOutcome(true, null, null, false), "invalid_id");
  });

  it("resolves invalid_id when API returns 400 VALIDATION_ERROR", () => {
    assert.equal(
      resolveClassDetailOutcome(false, { statusCode: 400, code: "VALIDATION_ERROR" }, null),
      "invalid_id",
    );
  });

  it("resolves loading when loading is true and validId is true", () => {
    assert.equal(resolveClassDetailOutcome(true, null, null), "loading");
    assert.equal(resolveClassDetailOutcome(true, new Error("err"), mockDetail), "loading");
  });

  it("resolves not_found when API returns 404 CLASS_NOT_FOUND", () => {
    assert.equal(
      resolveClassDetailOutcome(false, { statusCode: 404, code: "CLASS_NOT_FOUND" }, null),
      "not_found",
    );
  });

  it("resolves forbidden when API returns 403 CLASS_ACCESS_DENIED", () => {
    assert.equal(
      resolveClassDetailOutcome(false, { statusCode: 403, code: "CLASS_ACCESS_DENIED" }, null),
      "forbidden",
    );
  });

  it("resolves error on generic network/server error", () => {
    assert.equal(resolveClassDetailOutcome(false, new Error("Network Failed"), null), "error");
    assert.equal(resolveClassDetailOutcome(false, null, null), "error");
  });

  it("resolves empty when class has 0 lessons", () => {
    const emptyLessonsDetail = { ...mockDetail, lessons: [] };
    assert.equal(resolveClassDetailOutcome(false, null, emptyLessonsDetail), "empty");
  });

  it("resolves ready when class has lessons", () => {
    assert.equal(resolveClassDetailOutcome(false, null, mockDetail), "ready");
  });
});

describe("A08 · Lesson Detail Outcome Resolution", () => {
  const lessonId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

  it("resolves invalid_id when validIds is false", () => {
    assert.equal(resolveLessonDetailOutcome(false, null, null, lessonId, false), "invalid_id");
  });

  it("resolves loading when loading is true", () => {
    assert.equal(resolveLessonDetailOutcome(true, null, null, lessonId), "loading");
  });

  it("resolves forbidden when error is 403", () => {
    assert.equal(
      resolveLessonDetailOutcome(false, { statusCode: 403, code: "CLASS_ACCESS_DENIED" }, null, lessonId),
      "forbidden",
    );
  });

  it("resolves not_found when error is 404", () => {
    assert.equal(
      resolveLessonDetailOutcome(false, { statusCode: 404, code: "CLASS_NOT_FOUND" }, null, lessonId),
      "not_found",
    );
  });

  it("resolves not_found when lesson is not found in class lessons", () => {
    assert.equal(
      resolveLessonDetailOutcome(false, null, mockDetail, "non-existent-lesson-id"),
      "not_found",
    );
  });

  it("resolves ready when lesson is found in class lessons", () => {
    assert.equal(
      resolveLessonDetailOutcome(false, null, mockDetail, lessonId),
      "ready",
    );
  });
});

describe("A08 · Date Formatting Helper", () => {
  it("formats valid ISO timestamp to locale date string", () => {
    const formatted = formatClassJoinedDate("2026-08-05T10:30:00.000Z");
    assert.match(formatted, /\d{2}\/\d{2}\/\d{4}/);
  });

  it("returns fallback input string when timestamp is invalid", () => {
    assert.equal(formatClassJoinedDate("invalid-date"), "invalid-date");
  });
});

describe("A08 · Static Security & Integration Invariants", () => {
  const detailPage = read("../src/app/student/(app)/classes/[classId]/page.tsx");
  const lessonPage = read("../src/app/student/(app)/classes/[classId]/lessons/[lessonId]/page.tsx");
  const serviceFile = read("../src/lib/student/classes-service.ts");

  it("service defines fetchEnrolledClassDetail calling /student/classes/:id", () => {
    assert.match(serviceFile, /fetchEnrolledClassDetail/);
    assert.match(serviceFile, /\/student\/classes\//);
  });

  it("classes/[classId]/page.tsx imports fetchEnrolledClassDetail", () => {
    assert.match(detailPage, /fetchEnrolledClassDetail/);
  });

  it("classes/[classId]/page.tsx does not import from lms-data fixture", () => {
    assert.doesNotMatch(detailPage, /lms-data/);
  });

  it("classes/[classId]/page.tsx does not include DemoStateSwitcher", () => {
    assert.doesNotMatch(detailPage, /DemoStateSwitcher/);
  });

  it("classes/[classId]/page.tsx does not leak enrollmentCode", () => {
    assert.doesNotMatch(detailPage, /enrollmentCode/);
  });

  it("lessons/[lessonId]/page.tsx does not import from lms-data fixture", () => {
    assert.doesNotMatch(lessonPage, /lms-data/);
  });

  it("lessons/[lessonId]/page.tsx does not include DemoStateSwitcher", () => {
    assert.doesNotMatch(lessonPage, /DemoStateSwitcher/);
  });

  it("both pages include backlink navigation", () => {
    assert.match(detailPage, /href="\/student\/classes"/);
    assert.match(lessonPage, /href=\{`\/student\/classes\/\$\{detail\.id\}`\}/);
  });
});
