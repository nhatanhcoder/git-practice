import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const grammarPageSource = readFileSync(
  new URL("../src/app/student/(app)/grammar/page.tsx", import.meta.url),
  "utf8",
);

describe("A05 · Grammar Page Structure & Hook-Order Gating", () => {
  it("default export GrammarPage contains no React hooks (prevents conditional hook order violation)", () => {
    // Extract the default export function body
    const defaultExportMatch = grammarPageSource.match(
      /export default function GrammarPage\s*\([^)]*\)\s*\{([\s\S]*?)\}\n*$/,
    );
    assert.ok(defaultExportMatch, "GrammarPage default export must exist");

    const defaultExportBody = defaultExportMatch[1];
    assert.doesNotMatch(
      defaultExportBody,
      /\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useToast|useStudentStore)\s*\(/,
      "Default export GrammarPage must not call any React hooks directly",
    );
  });

  it("gates production rendering to UnavailableState at the top level without executing hooks", () => {
    assert.match(
      grammarPageSource,
      /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*["']production["']\s*\)\s*\{\s*return\s*\(\s*<UnavailableState/,
      "GrammarPage must gate production with UnavailableState",
    );
  });

  it("delegates to GrammarInner in non-production mode containing all hooks and drill tabs", () => {
    assert.match(
      grammarPageSource,
      /function GrammarInner\s*\(/,
      "GrammarInner component must exist to host the actual interactive hooks",
    );
    assert.match(
      grammarPageSource,
      /<GrammarInner\s*\/>/,
      "GrammarPage must return <GrammarInner /> when not in production",
    );
    assert.match(
      grammarPageSource,
      /const EXERCISE_TABS/,
      "GrammarInner must retain the 5 exercise shapes (mcq, blank, reorder, match, reflex)",
    );
  });
});
