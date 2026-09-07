import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CLASSES_ROUTE,
  resolveClassesOutcome,
  resolveTeacherName,
} from "../src/lib/student/classes-rules.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("A06 · Teacher Name Resolution", () => {
  it("uses nickname when present and trimmed", () => {
    assert.equal(
      resolveTeacherName({
        id: "t1",
        nickname: "Cô Phạm Thu Hà",
        email: "ha.pham@example.com",
        avatarUrl: null,
      }),
      "Cô Phạm Thu Hà",
    );
  });

  it("falls back to email when nickname is null", () => {
    assert.equal(
      resolveTeacherName({
        id: "t2",
        nickname: null,
        email: "teacher2@example.com",
        avatarUrl: null,
      }),
      "teacher2@example.com",
    );
  });

  it("falls back to email when nickname is empty string or whitespace", () => {
    assert.equal(
      resolveTeacherName({
        id: "t3",
        nickname: "   ",
        email: "teacher3@example.com",
        avatarUrl: null,
      }),
      "teacher3@example.com",
    );
  });
});

describe("A06 · Presentation Outcome Resolution", () => {
  it("resolves loading outcome first", () => {
    assert.equal(resolveClassesOutcome(true, null, 0), "loading");
    assert.equal(resolveClassesOutcome(true, new Error("err"), 5), "loading");
  });

  it("resolves error outcome when not loading and error exists", () => {
    assert.equal(resolveClassesOutcome(false, new Error("err"), 0), "error");
    assert.equal(resolveClassesOutcome(false, "Failed to fetch", 2), "error");
  });

  it("resolves empty outcome when no classes exist", () => {
    assert.equal(resolveClassesOutcome(false, null, 0), "empty");
  });

  it("resolves ready outcome when classes exist", () => {
    assert.equal(resolveClassesOutcome(false, null, 3), "ready");
  });

  it("defines the canonical student classes route constant", () => {
    assert.equal(CLASSES_ROUTE, "/student/classes");
  });
});

describe("A06 · Classes Page Real Endpoint Integration", () => {
  const classesPage = read("../src/app/student/(app)/classes/page.tsx");
  const serviceFile = read("../src/lib/student/classes-service.ts");

  it("calls the real student classes endpoint GET /student/classes", () => {
    assert.match(
      serviceFile,
      /\/student\/classes/,
      "service must call /student/classes",
    );
    assert.match(
      classesPage,
      /fetchMyEnrolledClasses/,
      "classes page must import and invoke fetchMyEnrolledClasses",
    );
  });

  it("no longer imports or relies on mock studentClasses fixture", () => {
    assert.doesNotMatch(
      classesPage,
      /studentClasses/,
      "classes page must not import or render mock studentClasses",
    );
  });

  it("removes DemoStateSwitcher from the production classes page", () => {
    assert.doesNotMatch(
      classesPage,
      /DemoStateSwitcher/,
      "DemoStateSwitcher must not be present on the real classes screen",
    );
  });

  it("does not leak enrollmentCode on student class cards", () => {
    assert.doesNotMatch(
      classesPage,
      /enrollmentCode/,
      "enrollmentCode is omitted from student endpoint and must not appear on class cards",
    );
  });

  it("does not fabricate assignment/homework openCount numbers", () => {
    assert.doesNotMatch(
      classesPage,
      /openCount|assignmentsForClass/,
      "classes page must not fabricate homework counts without real backend endpoints",
    );
  });

  it("marks join class action as unavailable pending A07 without fake-success", () => {
    assert.match(
      classesPage,
      /A07/,
      "join modal must inform learner that join API is connecting in A07",
    );
    assert.doesNotMatch(
      classesPage,
      /setJoined\(\s*\(prev\)/,
      "classes page must not mutate local state to fake join success",
    );
  });
});