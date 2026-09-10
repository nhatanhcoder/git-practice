/**
 * Regression test for the prod-return-before-hooks pattern (2026-09-09 batch).
 *
 * 17 student pages early-returned their production UnavailableState BEFORE running
 * any hook, which is a Rules-of-Hooks violation: the component becomes conditionally
 * hooked. A05 fixed it for /mistakes/review with a comment; this test keeps every
 * other student page from regressing to the same shape.
 *
 * The rule this enforces, precisely: inside each `page.tsx` component under
 * `student/(app)`, any `if (process.env.NODE_ENV === "production") { return ... }`
 * branch must appear AFTER the first hook call — i.e. no hooks may follow the block.
 * (Placement after ALL hooks is the convention; "no hook after the block" is the
 * invariant, because a hook after a conditional return is what React forbids.)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "app",
  "student",
);
const APP_DIR = join(webRoot, "(app)");

function listPages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listPages(full));
    else if (name === "page.tsx") out.push(full);
  }
  return out;
}

const HOOK_RE = /\buse[A-Z]\w*\s*\(|\buse[A-Z]\w*"(?!\w)/; // useState( / useStudentStore( / useRouter( ...

function firstHookLineAfter(lines, fromIdx) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (HOOK_RE.test(lines[i])) return i;
  }
  return -1;
}

test("no student page early-returns the prod branch before its hooks", () => {
  const pages = listPages(APP_DIR);
  assert.ok(pages.length >= 20, `expected the student app pages, found ${pages.length}`);

  const offenders = [];
  for (const page of pages) {
    const src = readFileSync(page, "utf8");
    const lines = src.split("\n");
    const start = lines.findIndex((l) =>
      /if \(process\.env\.NODE_ENV === ["']production["']\)/.test(l),
    );
    if (start === -1) continue;

    // Find the end of the conditional block (first "  }" after the if).
    let end = -1;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^  \}$/.test(lines[i])) {
        end = i;
        break;
      }
    }
    assert.notEqual(end, -1, `unterminated prod branch in ${page}`);

    const hookAfter = firstHookLineAfter(lines, end + 1);
    if (hookAfter !== -1) {
      offenders.push(
        `${page}: hook at line ${hookAfter + 1} runs after the prod early-return at line ${start + 1}`,
      );
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "Rules-of-Hooks violation: prod early-return must come after every hook.\n" +
      offenders.join("\n"),
  );
});
