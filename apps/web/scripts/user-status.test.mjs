import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextStatus } from "../src/lib/user-status.js";

describe("nextStatus", () => {
  it("moves pending accounts to active", () => {
    assert.equal(nextStatus("pending", "approve"), "active");
  });
  it("moves active accounts to suspended", () => {
    assert.equal(nextStatus("active", "suspend"), "suspended");
  });
  it("moves suspended accounts to active", () => {
    assert.equal(nextStatus("suspended", "activate"), "active");
  });
});
