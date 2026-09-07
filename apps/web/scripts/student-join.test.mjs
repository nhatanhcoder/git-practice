import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  joinFailureMessage,
  normalizeJoinCode,
  validateJoinCode,
  JOIN_CODE_MESSAGES,
} from "../src/lib/student/classes-rules.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

/**
 * A07 regression tests. CODE A07 rules:
 * - Validate enrollmentCode theo DTO approved (JoinClassDto), không tự đặt regex.
 * - Send payload enrollmentCode qua API client hiện có.
 * - Lỗi mã sai/đã tham gia/archived theo registry thực tế.
 * - Request fail giữ input, không thêm lớp local giả.
 *
 * Everything testable at runtime lives in classes-rules.ts (a leaf module, so
 * node's native type-stripping loads it directly). describeJoinFailure is thin
 * glue over ApiError — importing api-client here needs a resolution hook the
 * repo does not have on main yet — so its wiring is asserted on the file, while
 * the actual message logic it delegates to is runtime-tested above.
 */

describe("A07 · normalizeJoinCode mirrors JoinClassDto", () => {
  it("trims surrounding whitespace before anything else", () => {
    assert.equal(normalizeJoinCode("  H3TT2645  "), "H3TT2645");
  });

  it("uppercases lowercase input", () => {
    assert.equal(normalizeJoinCode("h3tt2645"), "H3TT2645");
  });

  it("does not remove interior characters — trim is the DTO's only cleanup", () => {
    // The DTO trims; it never strips interior spaces. A code with an inner space
    // must stay wrong rather than being silently "fixed" into a valid one.
    assert.equal(normalizeJoinCode("H3TT 2645"), "H3TT 2645");
  });
});

describe("A07 · validateJoinCode (shape is answered locally, existence by the server)", () => {
  it("accepts a well-formed code", () => {
    assert.equal(validateJoinCode("H3TT2645"), null);
  });

  it("accepts a code the learner typed with spaces or lowercase", () => {
    assert.equal(validateJoinCode(" h3tt2645 "), null);
  });

  it("rejects 7 and 9 characters with the DTO length message", () => {
    assert.equal(validateJoinCode("H3TT264"), "length");
    assert.equal(validateJoinCode("H3TT26459"), "length");
  });

  it("rejects an empty input with the length issue, not a crash", () => {
    assert.equal(validateJoinCode(""), "length");
    assert.equal(validateJoinCode("   "), "length");
  });

  it("rejects characters outside A-Z0-9 — hyphen, space, diacritics, look-alike Cyrillic", () => {
    assert.equal(validateJoinCode("H3TT-264"), "charset");
    assert.equal(validateJoinCode("H3TT 264"), "charset");
    assert.equal(validateJoinCode("H3TT2645é"), "charset");
    // Cyrillic Т (U+0422) looks like Latin T but is not one — a code typed on a
    // bad keyboard layout must fail charset here, never reach the server.
    assert.equal(validateJoinCode("H3TТ2645"), "charset");
  });

  it("carries the DTO's own messages, not invented wording", () => {
    assert.equal(JOIN_CODE_MESSAGES.length, "Mã ghi danh gồm đúng 8 ký tự");
    assert.equal(JOIN_CODE_MESSAGES.charset, "Mã ghi danh chỉ gồm chữ in hoa và chữ số");
  });
});

describe("A07 · joinFailureMessage maps registry codes, never invents causes", () => {
  it("answers each code the contract lists for join", () => {
    assert.match(joinFailureMessage("CLASS_ENROLL_CODE_INVALID"), /không tồn tại/i);
    assert.match(joinFailureMessage("CLASS_ALREADY_ARCHIVED"), /lưu trữ/i);
    assert.match(joinFailureMessage("CLASS_ALREADY_ENROLLED"), /đã ở trong lớp/i);
    assert.match(joinFailureMessage("VALIDATION_ERROR"), /8 ký tự/i);
  });

  it("falls back to a generic failure for unknown codes instead of guessing", () => {
    const unknown = joinFailureMessage("SOME_FUTURE_CODE");
    assert.ok(unknown.length > 0);
    const mapped = [
      "CLASS_ENROLL_CODE_INVALID",
      "CLASS_ALREADY_ARCHIVED",
      "CLASS_ALREADY_ENROLLED",
      "VALIDATION_ERROR",
    ].map((code) => joinFailureMessage(code));
    assert.ok(
      !mapped.includes(unknown),
      "an unknown code must not borrow a specific cause's wording",
    );
  });
});

describe("A07 · describeJoinFailure wiring (glue over the tested mapping)", () => {
  const serviceFile = read("../src/lib/student/classes-service.ts");

  it("delegates server answers to the registry mapping via ApiError.code", () => {
    assert.match(serviceFile, /err instanceof ApiError/);
    assert.match(serviceFile, /joinFailureMessage\(err\.code\)/);
  });

  it("answers network silence with its own wording, not a server code", () => {
    assert.match(serviceFile, /Không kết nối được máy chủ/);
  });
});

describe("A07 · the join goes through the real endpoint with the real payload", () => {
  const serviceFile = read("../src/lib/student/classes-service.ts");
  const classesPage = read("../src/app/student/(app)/classes/page.tsx");

  it("POSTs exactly { enrollmentCode } to /student/classes/join", () => {
    assert.match(serviceFile, /\/student\/classes\/join/);
    assert.match(serviceFile, /enrollmentCode: normalizeJoinCode\(rawCode\)/);
    assert.doesNotMatch(serviceFile, /studentId/, "userId is the token's job, never a payload field");
  });

  it("the page calls joinClassByCode and refetches the list on success", () => {
    assert.match(classesPage, /joinClassByCode/);
    assert.match(classesPage, /await loadClasses\(\)/);
  });

  it("no fake-success: no local class list mutation on the join path", () => {
    assert.doesNotMatch(classesPage, /setClasses\(\(prev\)/);
    assert.doesNotMatch(classesPage, /setJoined\(/);
  });

  it("double-submit is guarded by a ref lock, not state alone", () => {
    assert.match(classesPage, /joinLock/);
    assert.match(classesPage, /if \(joinLock\.current\) return/);
  });
});
