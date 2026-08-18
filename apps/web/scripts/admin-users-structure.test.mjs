import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const listPage = readFileSync(new URL("../src/app/admin/users/page.tsx", import.meta.url), "utf8");
const detailPage = readFileSync(new URL("../src/app/admin/users/[userId]/page.tsx", import.meta.url), "utf8");

describe("Admin users v2 structure", () => {
  it("uses the shared status mapping and all review states on the list page", () => {
    assert.match(listPage, /import \{ getStatusColor \} from "\.\.\/\.\.\/\.\.\/lib\/status"/);
    for (const state of ["ready", "loading", "empty", "partial", "error", "forbidden"]) {
      assert.match(listPage, new RegExp(`"${state}"`));
    }
  });

  it("keeps layout styling out of list-page JSX", () => {
    assert.doesNotMatch(listPage, /style=\{\{[^}]*\b(display|gap|margin|padding|width|height|alignItems|flexWrap)\b/);
  });

  it("gives the detail page one standalone stylesheet", () => {
    assert.match(detailPage, /import styles from "\.\/detail\.module\.css"/);
    assert.doesNotMatch(detailPage, /baseStyles|const styles = \{/);
    assert.doesNotMatch(detailPage, /style=\{\{[^}]*\b(display|gap|margin|padding|width|height|alignItems|flexWrap)\b/);
  });
});
