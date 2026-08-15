import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluatePasswordStrength } from "../src/lib/password-strength.ts";
import { formatDate, getInitials, initialAdminProfile } from "../src/lib/auth-profile-data.ts";
import { getStatusTone, getStatusColor } from "../src/lib/status.ts";

describe("Password Strength Evaluator", () => {
  it("returns score 0 for empty password", () => {
    const res = evaluatePasswordStrength("");
    assert.equal(res.score, 0);
    assert.equal(res.percent, 0);
  });

  it("returns weak for short passwords", () => {
    const res = evaluatePasswordStrength("abc");
    assert.equal(res.score, 0);
    assert.equal(res.hasMinLength, false);
  });

  it("returns medium for >=8 chars with numbers only", () => {
    const res = evaluatePasswordStrength("password123");
    assert.equal(res.score, 2);
    assert.equal(res.hasMinLength, true);
    assert.equal(res.hasNumber, true);
    assert.equal(res.hasUppercase, false);
  });

  it("returns strong for >=8 chars with uppercase and numbers", () => {
    const res = evaluatePasswordStrength("Password123!");
    assert.equal(res.score, 3);
    assert.equal(res.percent, 100);
    assert.equal(res.color, "#16A34A");
    assert.equal(res.hasMinLength, true);
    assert.equal(res.hasUppercase, true);
    assert.equal(res.hasNumber, true);
  });
});

describe("Profile Helpers & Formatting", () => {
  it("computes initials correctly", () => {
    assert.equal(getInitials("Bùi Anh Tuấn"), "BT");
    assert.equal(getInitials("Admin"), "AD");
    assert.equal(getInitials(""), "—");
  });

  it("formats ISO dates at render time only", () => {
    assert.equal(formatDate("2025-11-05T00:00:00.000Z"), "05/11/2025");
    assert.equal(formatDate(null), "—");
  });

  it("has valid default admin profile data", () => {
    assert.equal(initialAdminProfile.role, "admin");
    assert.equal(initialAdminProfile.email, "tuanbui@example.com");
  });
});

describe("Status Color Mapping (status.ts)", () => {
  it("maps active, paid to success", () => {
    assert.equal(getStatusTone("active"), "success");
    assert.equal(getStatusColor("active").hex, "#16A34A");
  });

  it("maps pending, unpaid to warning", () => {
    assert.equal(getStatusTone("pending"), "warning");
    assert.equal(getStatusColor("pending").hex, "#D97706");
  });

  it("maps suspended, rejected to danger", () => {
    assert.equal(getStatusTone("suspended"), "danger");
    assert.equal(getStatusColor("suspended").hex, "#DC2626");
  });
});
