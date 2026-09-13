/**
 * Independent route tests for the public landing (2026-09-12, owner direction:
 * the landing lives at /landing; /student/landing redirects there).
 *
 * Static/source assertions — no server needed. The rendered-behaviour checks
 * (render, redirect chain, brand link, 375px) live in
 * apps/web/tests/landing-route.spec.ts (Playwright, production build).
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

/** Strip JS/CSS comments so the banned-words rule checks CONTENT, not the
 *  guard comment that names those words to explain why they are banned. */
function stripComments(src) {
  const block = new RegExp("/\\*[\\s\\S]*?\\*/", "g");
  const line = new RegExp("(^|[^:])//[^\\n]*", "g");
  return src.replace(block, " ").replace(line, "$1 ");
}

test("next.config redirects /student/landing to /landing (backward compatibility)", () => {
  const config = readFileSync(join(WEB, "next.config.mjs"), "utf8");
  assert.match(config, /source:\s*'\/student\/landing'/);
  assert.match(config, /destination:\s*'\/landing'/);
});

test("the /landing route exists as a real page", () => {
  const page = readFileSync(join(WEB, "src", "app", "landing", "page.tsx"), "utf8");
  assert.ok(page.includes("Một con đường"), "hero title present");
  assert.ok(page.includes("/register"), "signup CTA present");
});

test("no hardcoded /student/landing link remains in src (the redirect config is the only mention)", () => {
  const offenders = walk(SRC)
    .filter((f) => /\.(tsx?|css)$/.test(f))
    .filter((f) => !f.includes("next.config"))
    .filter((f) => readFileSync(f, "utf8").includes("/student/landing"));
  assert.deepEqual(offenders, [], `files still referencing the old path: ${offenders.join(", ")}`);
});

test("the landing asserts nothing about people (WEB-017 stays in force)", () => {
  const page = stripComments(readFileSync(join(WEB, "src", "app", "landing", "page.tsx"), "utf8"));
  const css = stripComments(readFileSync(join(WEB, "src", "app", "landing", "landing.css"), "utf8"));
  const haystack = (page + " " + css).toLowerCase();
  for (const invented of ["giáo viên", "trương vĩ", "tiến sĩ", "giám khảo", "bảng vàng", "testimonial"]) {
    assert.ok(!haystack.includes(invented), `landing must not contain "${invented}"`);
  }
  // the factual counts that ARE allowed
  assert.ok(page.includes("214"), "verified radical count present");
  assert.ok(page.includes("76"), "verified grammar count present");
});

test("the auth shell's brand link points at /landing", () => {
  const shell = readFileSync(join(WEB, "src", "components", "auth", "auth-shell.tsx"), "utf8");
  assert.match(shell, /href="\/landing"/);
  assert.ok(!shell.includes('"/student/landing"'), "old brand target gone");
});

test("auth styles resolve real tokens (the --fg/--fg-muted wash-out bug stays dead)", () => {
  const css = readFileSync(join(WEB, "src", "styles", "hanlu", "auth.css"), "utf8");
  assert.ok(!css.includes("var(--fg)"), "undefined --fg token referenced");
  assert.ok(!css.includes("var(--fg-muted"), "undefined --fg-muted token referenced");
  assert.ok(css.includes("var(--text-1"), "real text token in use");

  const tokens = readFileSync(join(WEB, "src", "styles", "hanlu", "tokens.css"), "utf8");
  assert.ok(tokens.includes("--text-1:"), "--text-1 is a defined token");
});
