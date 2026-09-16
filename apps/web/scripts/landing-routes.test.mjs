/**
 * Independent route tests for the landing path (2026-09-14, WEB-017 final
 * resolution: the prototype landing is REMOVED — owner decision on record —
 * and both historical paths redirect to the login gate).
 *
 * Static/source assertions — no server needed. The rendered-behaviour checks
 * (redirect chain, gate renders) live in apps/web/tests/landing-route.spec.ts.
 *
 * NOTE: if the owner later approves a landing built from real content, this
 * file and landing-route.spec.ts revert to route-existence assertions in the
 * same commit as the new page (see the recipe in the WEB-017 resolution).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const WEB = join(process.cwd(), "apps", "web");
const SRC = join(WEB, "src");

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function stripComments(src) {
  const block = new RegExp("/\\*[\\s\\S]*?\\*/", "g");
  const line = new RegExp("(^|[^:])//[^\\n]*", "g");
  return src.replace(block, " ").replace(line, "$1 ");
}

test("no landing route exists under src (removed, WEB-017)", () => {
  const offenders = walk(join(SRC, "app")).filter((f) => /landing/i.test(f));
  assert.deepEqual(offenders, [], `landing files still present: ${offenders.join(", ")}`);
});

test("both historical landing paths redirect to the login gate", () => {
  const config = readFileSync(join(WEB, "next.config.mjs"), "utf8");
  for (const source of ["/landing", "/student/landing", "/student/landing/:path*"]) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`source:\\s*["']${escaped}["']`);
    assert.match(config, pattern, `missing redirect for ${source}`);
  }
  assert.ok(!/destination:\s*["']\/landing["']/.test(config), "no redirect may point at the removed page");
});

test("no live /landing reference remains in src (comments and the redirect config excepted)", () => {
  const offenders = walk(SRC)
    .filter((f) => /\.(tsx?|css)$/.test(f))
    .filter((f) => !f.includes("next.config"))
    .filter((f) => stripComments(readFileSync(f, "utf8")).includes("/landing"));
  assert.deepEqual(offenders, [], `files still referencing /landing: ${offenders.join(", ")}`);
});

test("no invented-people data survives anywhere in src", () => {
  const offenders = walk(SRC)
    .filter((f) => /\.(tsx?|css)$/.test(f))
    .filter((f) => {
      const c = readFileSync(f, "utf8");
      return /Tiến sĩ Ngôn ngữ học PKU|Giám khảo Hanban|Bảng vàng|fullTestimonial/.test(c);
    });
  assert.deepEqual(offenders, [], `invented-content files still present: ${offenders.join(", ")}`);
});

test("the auth shell's brand link does not point at the removed page", () => {
  const shell = readFileSync(join(WEB, "src", "components", "auth", "auth-shell.tsx"), "utf8");
  assert.match(shell, /href="\/"/, "brand points at the app root");
  assert.ok(!shell.includes('href="/landing"'), "old brand target gone");
});

test("auth styles still resolve real tokens (the --fg wash-out fix stays in place)", () => {
  const css = readFileSync(join(WEB, "src", "styles", "hanlu", "auth.css"), "utf8");
  assert.ok(!css.includes("var(--fg)"), "undefined --fg token referenced");
  assert.ok(!css.includes("var(--fg-muted"), "undefined --fg-muted token referenced");
  assert.match(css, /\.auth-submit\s*{[^}]*--text-inverse/, "submit button keeps the per-theme ink token");
});

test("the teacher portraits and the three dependency are gone with the page", () => {
  let portraits;
  try {
    portraits = readdirSync(join(WEB, "public", "teachers"));
  } catch {
    portraits = null; // directory removed — expected
  }
  assert.equal(portraits, null, "teacher portraits directory deleted");
  const pkg = readFileSync(join(WEB, "package.json"), "utf8");
  assert.ok(!pkg.includes('"three"'), "three dependency removed");
});
