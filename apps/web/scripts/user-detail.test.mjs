import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getUserDetailDataset } from "../src/lib/user-detail-data.js";

describe("getUserDetailDataset", () => {
  it("returns the pending student dataset for user 1", () => {
    const result = getUserDetailDataset("1");
    assert.equal(result?.user.role, "student");
    assert.equal(result?.user.status, "pending");
  });

  it("returns the active teacher dataset for user 4", () => {
    const result = getUserDetailDataset("4");
    assert.equal(result?.user.role, "teacher");
    assert.equal(result?.classes.length, 2);
  });

  it("returns null for an unknown user", () => {
    assert.equal(getUserDetailDataset("missing"), null);
  });
});
