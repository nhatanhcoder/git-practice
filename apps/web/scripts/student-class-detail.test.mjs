import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  formatClassJoinedDate,
  isValidUuid,
  resolveClassDetailOutcome,
  resolveLessonDetailOutcome,
  resolveSingleLessonOutcome,
  describeLeaveFailure,
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

describe("Student lesson detail · single-endpoint outcome (S-LESSON-2)", () => {
  const mockLesson = mockDetail.lessons[0];

  it("resolves invalid_id when validIds is false", () => {
    assert.equal(resolveSingleLessonOutcome(false, null, null, false), "invalid_id");
    assert.equal(resolveSingleLessonOutcome(true, null, mockLesson, false), "invalid_id");
  });

  it("resolves loading when loading is true", () => {
    assert.equal(resolveSingleLessonOutcome(true, null, null), "loading");
    assert.equal(resolveSingleLessonOutcome(true, new Error("err"), mockLesson), "loading");
  });

  it("resolves invalid_id on 400 VALIDATION_ERROR", () => {
    assert.equal(
      resolveSingleLessonOutcome(false, { statusCode: 400, code: "VALIDATION_ERROR" }, null),
      "invalid_id",
    );
  });

  it("resolves forbidden on 403 CLASS_ACCESS_DENIED", () => {
    assert.equal(
      resolveSingleLessonOutcome(false, { statusCode: 403, code: "CLASS_ACCESS_DENIED" }, null),
      "forbidden",
    );
  });

  it("resolves not_found on 404 LESSON_NOT_FOUND (cross-class lesson)", () => {
    assert.equal(
      resolveSingleLessonOutcome(false, { statusCode: 404, code: "LESSON_NOT_FOUND" }, null),
      "not_found",
    );
  });

  it("resolves not_found on 404 CLASS_NOT_FOUND", () => {
    assert.equal(
      resolveSingleLessonOutcome(false, { statusCode: 404, code: "CLASS_NOT_FOUND" }, null),
      "not_found",
    );
  });

  it("resolves error when the payload is missing without an error", () => {
    assert.equal(resolveSingleLessonOutcome(false, new Error("Network Failed"), null), "error");
    assert.equal(resolveSingleLessonOutcome(false, null, null), "error");
  });

  it("resolves ready when the lesson payload is present", () => {
    assert.equal(resolveSingleLessonOutcome(false, null, mockLesson), "ready");
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

  it("service defines leaveEnrolledClass using the documented DELETE endpoint", () => {
    assert.match(serviceFile, /leaveEnrolledClass/);
    assert.match(serviceFile, /method:\s*["']DELETE["']/);
    assert.match(serviceFile, /\/student\/classes\/\$\{encodeURIComponent\(classId\)\}\/leave/);
  });

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

  it("classes/[classId]/page.tsx uses the leave service and does not claim success locally", () => {
    assert.match(detailPage, /leaveEnrolledClass/);
    assert.match(detailPage, /await leaveEnrolledClass/);
    assert.doesNotMatch(detailPage, /setLeft\(/);
    assert.doesNotMatch(detailPage, /pending A09/);
  });

  it("classes/[classId]/page.tsx keeps the leave action disabled while the request is pending", () => {
    assert.match(detailPage, /leaveSubmitting/);
    assert.match(detailPage, /disabled=\{leaveSubmitting\}/);
  });

  it("classes/[classId]/page.tsx does not leak enrollmentCode", () => {
    assert.doesNotMatch(detailPage, /enrollmentCode/);
  });

  it("lessons/[lessonId]/page.tsx does not import from lms-data fixture", () => {
    assert.doesNotMatch(lessonPage, /lms-data/);
  });

  it("service defines fetchEnrolledLessonDetail calling the nested lesson endpoint", () => {
    assert.match(serviceFile, /fetchEnrolledLessonDetail/);
    assert.match(
      serviceFile,
      /\/student\/classes\/\$\{encodeURIComponent\(classId\)\}\/lessons\/\$\{encodeURIComponent\(lessonId\)\}/,
    );
  });

  it("lessons/[lessonId]/page.tsx reads the dedicated endpoint instead of filtering a class payload", () => {
    assert.match(lessonPage, /fetchEnrolledLessonDetail/);
    assert.match(lessonPage, /resolveSingleLessonOutcome/);
    assert.doesNotMatch(lessonPage, /detail\.lessons\.find/);
  });

  it("lessons/[lessonId]/page.tsx does not include DemoStateSwitcher", () => {
    assert.doesNotMatch(lessonPage, /DemoStateSwitcher/);
  });

  it("both pages include backlink navigation", () => {
    assert.match(detailPage, /href="\/student\/classes"/);
    assert.match(lessonPage, /href=\{`\/student\/classes\/\$\{classId\}`\}/);
  });

  it("neither page uses dead CSS token var(--color-text-muted)", () => {
    assert.doesNotMatch(detailPage, /--color-text-muted/);
    assert.doesNotMatch(lessonPage, /--color-text-muted/);
  });

  it("lessons/[lessonId]/page.tsx renders unavailable notice for assignments rather than fake-empty copy", () => {
    assert.doesNotMatch(
      lessonPage,
      /Chưa có bài tập nào được giao/,
      "must not render fake-empty copy pretending to know assignment count",
    );
    assert.match(
      lessonPage,
      /S-LESSON-3/,
      "must render clear unavailable notice referencing the upcoming assignment feature",
    );
  });
});

describe("A09 · Leave and rejoin invariants", () => {
  const detailPage = read("../src/app/student/(app)/classes/[classId]/page.tsx");
  const serviceFile = read("../src/lib/student/classes-service.ts");
  const classesPage = read("../src/app/student/(app)/classes/page.tsx");

  it("maps documented leave failures without inventing a cause", () => {
    assert.match(describeLeaveFailure("CLASS_NOT_ENROLLED"), /không còn ở trong lớp/i);
    assert.match(describeLeaveFailure("CLASS_ACCESS_DENIED"), /quyền truy cập/i);
    assert.match(describeLeaveFailure("CLASS_NOT_FOUND"), /không tìm thấy lớp/i);
    assert.match(describeLeaveFailure("VALIDATION_ERROR"), /không hợp lệ/i);
    assert.match(describeLeaveFailure("UNKNOWN_CODE"), /Không thể rời lớp/i);
  });

  it("uses the documented leave endpoint and never deletes enrollment locally", () => {
    assert.match(serviceFile, /DELETE/);
    assert.match(serviceFile, /\/student\/classes\/\$\{encodeURIComponent\(classId\)\}\/leave/);
    assert.doesNotMatch(detailPage, /setDetail\(null\)/);
    assert.doesNotMatch(detailPage, /filter\([^\n]*classId/);
  });

  it("keeps cancel separate from the DELETE confirmation path", () => {
    assert.match(detailPage, /onClose=\{\(\) => \{/);
    assert.match(detailPage, /onClick=\{confirmLeave\}/);
    assert.match(detailPage, /await leaveEnrolledClass\(classId\)/);
    assert.match(detailPage, /router\.push\("\/student\/classes"\)/);
    assert.match(detailPage, /leaveSubmitting/);
  });

  it("does not leave the old unavailable A07 placeholder on the classes list", () => {
    assert.doesNotMatch(classesPage, /TASK A07/);
    assert.doesNotMatch(classesPage, /Đang kết nối A07/);
  });
});
