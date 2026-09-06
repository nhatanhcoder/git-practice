import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveIdentity, NEUTRAL_STUDENT_NAME } from "../src/lib/student/identity-rules.ts";

describe("Student Identity Resolution (resolveIdentity)", () => {
  it("resolves full name and initials correctly", () => {
    const res = resolveIdentity("Em Học Sinh Chăm Chỉ");
    assert.equal(res.name, "Em Học Sinh Chăm Chỉ");
    assert.equal(res.initials, "EC");
  });

  it("trims whitespace from name", () => {
    const res = resolveIdentity("  Mai Anh  ");
    assert.equal(res.name, "Mai Anh");
    assert.equal(res.initials, "MA");
  });

  it("handles single-word names", () => {
    const res = resolveIdentity("Admin");
    assert.equal(res.name, "Admin");
    assert.equal(res.initials, "AD");
  });

  it("falls back to neutral student name when null, undefined, or empty", () => {
    const fromNull = resolveIdentity(null);
    assert.equal(fromNull.name, NEUTRAL_STUDENT_NAME);
    assert.equal(fromNull.initials, "HV");

    const fromUndefined = resolveIdentity(undefined);
    assert.equal(fromUndefined.name, NEUTRAL_STUDENT_NAME);
    assert.equal(fromUndefined.initials, "HV");

    const fromEmpty = resolveIdentity("   ");
    assert.equal(fromEmpty.name, NEUTRAL_STUDENT_NAME);
    assert.equal(fromEmpty.initials, "HV");
  });
});
