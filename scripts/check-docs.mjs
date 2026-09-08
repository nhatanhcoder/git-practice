#!/usr/bin/env node
/**
 * check-docs.mjs — mechanical enforcement of the doc rules.
 *
 * Prose in AGENTS.md cannot make an agent obey. This script can: it runs in CI and
 * blocks the merge. Every check here corresponds to a real defect found by hand on
 * 2026-08-14 — see ai/known-issues/KNOWN_ISSUES.md.
 *
 * Run:  pnpm check:docs
 * Exit: 0 clean, 1 violations found.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, normalize, relative } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'archive', '.next', '.idea', '_to_delete', 'dist', '.turbo']);

/** Paths that rules mention but that legitimately do not exist yet.
 *  Each MUST be listed in multi-agent-workflow.md §0.1. Delete the entry once created. */
const ALLOW_MISSING = new Set([
  'packages/types',
  'ai/context/sessions',
  'turbo.json',
  'eslint.config.mjs',
  '.prettierrc',
  '.env.example',
  'apps/api',
  'prisma/schema.prisma',
  'apps/web/src/lib/status.ts',
]);

const failures = [];
const fail = (check, msg) => failures.push({ check, msg });

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const allFiles = walk(ROOT);
const mdFiles = allFiles.filter((f) => f.endsWith('.md'));
const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

// Some tool-provided skills are installed locally but intentionally ignored by Git.
// They must not make local checks disagree with a clean CI checkout.
const ignoredSkillDirs = new Set(
  existsSync(join(ROOT, '.gitignore'))
    ? readFileSync(join(ROOT, '.gitignore'), 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^\.agents\/skills\/[^/]+\/$/.test(line))
        .map((line) => line.slice(0, -1))
    : [],
);
const isIgnoredSkillPath = (path) => {
  const normalized = path.replace(/\\/g, '/');
  return [...ignoredSkillDirs].some(
    (dir) => normalized === dir || normalized.startsWith(`${dir}/`),
  );
};

/* 1 — broken internal markdown links ------------------------------------ */
for (const f of mdFiles) {
  for (const m of read(f).matchAll(/\[[^\]]*\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
    const link = m[1];
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    if (!existsSync(normalize(join(dirname(f), link)))) {
      fail('broken-link', `${rel(f)} -> ${link}`);
    }
  }
}

/* 2 — rules pointing at files that do not exist -------------------------- */
const RULE_FILES = ['AGENTS.md', 'CLAUDE.md', 'ai/rules/working-rules.md', 'ai/rules/multi-agent-workflow.md'];
for (const rf of RULE_FILES.filter(existsSync)) {
  for (const m of read(rf).matchAll(/`([a-zA-Z0-9_.@/-]+\.(?:md|ts|tsx|js|mjs|json|yaml|yml|prisma|css))`/g)) {
    const p = m[1];
    if (!p.includes('/') || p.startsWith('<') || ALLOW_MISSING.has(p)) continue;
    if (isIgnoredSkillPath(p)) continue;
    if (/^(src|app|packages|apps\/api|prisma)\//.test(p)) continue;
    if (!existsSync(join(ROOT, p))) fail('rule-points-nowhere', `${rf} -> \`${p}\``);
  }
}

/* 3 — endpoints used by FE contracts but absent from docs/api ------------ */
const EP = /(GET|POST|PATCH|PUT|DELETE)[^a-zA-Z0-9]{1,6}(\/(?:api\/v1\/)?[a-z0-9:/_{}.-]+)/gi;
const collectEndpoints = (dir) => {
  const s = new Set();
  if (!existsSync(dir)) return s;
  for (const f of walk(dir).filter((x) => x.endsWith('.md')))
    for (const m of read(f).matchAll(EP))
      s.add(`${m[1].toUpperCase()} ${m[2].replace('/api/v1', '').replace(/\/$/, '')}`);
  return s;
};
const apiEP = collectEndpoints(join(ROOT, 'docs/api'));
const feEP = collectEndpoints(join(ROOT, 'docs/front-end-design-docs'));
for (const e of feEP) {
  if (apiEP.has(e)) continue;
  if (/\.\.\.|\{|\bGET \/:/.test(e)) continue;          // prose placeholders
  fail('endpoint-undefined', `${e} — used in a FE contract, not in docs/api/**`);
}

/* 4 — error codes referenced but never defined --------------------------- */
const CODES_FILE = 'docs/api/API_ERROR_CODES.md';
if (existsSync(CODES_FILE)) {
  const defined = new Set([...read(CODES_FILE).matchAll(/`([A-Z][A-Z0-9]{2,}_[A-Z0-9_]+)`/g)].map((m) => m[1]));
  const DOC_NAMES = /^(API|FLOW|RBAC|PERMISSIONS|FEATURES|ENTITY|SPRINT|TASK|PROJECT|DESIGN|TEST|KNOWN|AI|DATABASE|TECH)_/;
  const scan = ['docs/front-end-design-docs', 'docs/api'];
  for (const d of scan)
    for (const f of walk(join(ROOT, d)).filter((x) => x.endsWith('.md')))
      for (const m of read(f).matchAll(/`([A-Z][A-Z0-9]{2,}_[A-Z0-9_]+)`/g)) {
        const c = m[1];
        if (defined.has(c) || DOC_NAMES.test(c) || c.endsWith('_MD')) continue;
        fail('errorcode-undefined', `${rel(f)} uses \`${c}\` — not in ${CODES_FILE}`);
      }
}

/* 5 — response envelope drift ------------------------------------------- */
for (const f of mdFiles) {
  const t = read(f);
  if (/"success"\s*:|success:\s*(true|false)/.test(t))
    fail('envelope-drift', `${rel(f)} contains a \`success\` flag — the envelope is flat (API_CONVENTIONS.md)`);
}

/* 6 — page-contract status vs. code on disk ------------------------------ */
const INDEX = 'docs/front-end-design-docs/pages/_INDEX.md';
if (existsSync(INDEX)) {
  for (const line of read(INDEX).split('\n')) {
    const m = line.match(/^\|\s*`(\/[^`]+)`\s*\|[^|]*\|[^|]*\|\s*([a-z-]+)\s*\|/);
    if (!m) continue;
    const [, route, status] = m;
    const seg = route.replace(/^\//, '').replace(/\[([^\]]+)\]/g, '[$1]');
    const onDisk = pageExists(seg);
    if (onDisk && status !== 'built')
      fail('status-drift', `${route} exists in apps/web but _INDEX.md says "${status}"`);
    if (!onDisk && status === 'built')
      fail('status-drift', `${route} marked "built" but apps/web/src/app/${seg}/page.tsx is missing`);
  }
}

/* 7 — skill hygiene ------------------------------------------------------ */
const SKILLS = '.agents/skills';
if (existsSync(SKILLS)) {
  for (const d of readdirSync(join(ROOT, SKILLS))) {
    if (ignoredSkillDirs.has(`${SKILLS}/${d}`)) continue;
    const p = join(ROOT, SKILLS, d, 'SKILL.md');
    if (!existsSync(p)) { fail('skill-broken', `${SKILLS}/${d}/ has no SKILL.md`); continue; }
    const t = read(p);
    if (!/^---[\s\S]*?\bdescription:/m.test(t))
      fail('skill-broken', `${SKILLS}/${d}/SKILL.md has no \`description\` — the agent will never load it`);
    if (t.length < 1500)
      fail('skill-broken', `${SKILLS}/${d}/SKILL.md is ${t.length} B — looks like a stub, not a skill body`);
  }
}
if (existsSync(join(ROOT, 'ai/skills')) && readdirSync(join(ROOT, 'ai/skills')).length)
  fail('skill-broken', 'ai/skills/ was removed 2026-08-14 — skills live only in .agents/skills/');

/* 8 — AGENTS.md and CLAUDE.md share one body ----------------------------- */
const MARKER = 'Project context lives in';
const bodyOf = (f) => {
  if (!existsSync(f)) return null;
  const t = read(f).replace(/\r\n/g, '\n');
  const i = t.indexOf(MARKER);
  return i === -1 ? null : t.slice(i).trim();
};
{
  const a = bodyOf('AGENTS.md');
  const b = bodyOf('CLAUDE.md');
  if (a === null || b === null) {
    fail('agents-claude-drift', `AGENTS.md / CLAUDE.md missing, or neither contains "${MARKER}"`);
  } else if (a !== b) {
    const la = a.split('\n'), lb = b.split('\n');
    const n = Math.max(la.length, lb.length);
    let first = null;
    for (let i = 0; i < n; i++) if (la[i] !== lb[i]) { first = i; break; }
    fail('agents-claude-drift',
      `bodies differ from line ${first + 1} of the shared section — edit BOTH files\n` +
      `      AGENTS.md: ${JSON.stringify((la[first] ?? '<end of file>').slice(0, 80))}\n` +
      `      CLAUDE.md: ${JSON.stringify((lb[first] ?? '<end of file>').slice(0, 80))}`);
  }
}

/* report ----------------------------------------------------------------- */
// Tooling rules need executable enforcement too: keep all named quality gates.
const qualityPath = join(ROOT, '.github/workflows/quality.yml');
if (!existsSync(qualityPath)) {
  fail('ci-quality', 'Missing .github/workflows/quality.yml');
} else {
  const quality = readFileSync(qualityPath, 'utf8');
  for (const command of ['pnpm lint', 'pnpm --filter web build', 'pnpm --filter web type-check',
    'pnpm --filter api build', 'pnpm --filter api type-check', 'pnpm --filter api test:ci',
    'node scripts/assert-ci-databases.mjs', 'node --test apps/web/scripts/*.test.mjs scripts/*.test.mjs']) {
    if (!quality.includes(`run: ${command}`)) fail('ci-quality', `Missing gate: ${command}`);
  }
  if (quality.includes('continue-on-error: true') || quality.includes('--suppress-all')) {
    fail('ci-quality', 'Quality gates must not ignore failures or regenerate the lint baseline.');
  }
}
const byCheck = {};
for (const { check, msg } of failures) (byCheck[check] ??= []).push(msg);
const NAMES = {
  'ci-quality': 'Required CI quality gates',
  'broken-link': 'Broken internal markdown links',
  'rule-points-nowhere': 'A rule references a file that does not exist',
  'endpoint-undefined': 'FE contract uses an endpoint absent from docs/api',
  'errorcode-undefined': 'Error code used but never defined',
  'envelope-drift': 'Response envelope drift (`success` flag)',
  'status-drift': 'Page status disagrees with the code on disk',
  'skill-broken': 'Skill is unloadable or split across files',
  'agents-claude-drift': 'AGENTS.md and CLAUDE.md have drifted apart',
};
if (!failures.length) {
  console.log('check-docs: all 9 checks passed.');
  process.exit(0);
}
for (const [check, msgs] of Object.entries(byCheck)) {
  console.error(`\n[${check}] ${NAMES[check] ?? check} — ${msgs.length}`);
  for (const m of msgs.slice(0, 40)) console.error(`  ${m}`);
  if (msgs.length > 40) console.error(`  ... and ${msgs.length - 40} more`);
}
console.error(`\ncheck-docs FAILED: ${failures.length} violation(s).`);
process.exit(1);

/**
 * Does a route have a page on disk?
 *
 * A URL segment is not always a directory segment: Next.js route groups are real folders whose
 * names are wrapped in parentheses and contribute nothing to the URL, so `/student/mistakes`
 * can legitimately live at `app/student/(app)/mistakes/page.tsx`. Checking only the literal
 * path reported that as "marked built but missing" for every route that moved into a group — a
 * false failure that blocks CI while the page is there and working.
 *
 * Tries the literal name at each level first, then any `(group)` directory beside it. Groups
 * can nest, so this recurses rather than special-casing a single level.
 */
function pageExists(seg) {
  const parts = seg.split('/').filter(Boolean);

  const walk = (dirAbs, i) => {
    if (i === parts.length) return existsSync(join(dirAbs, 'page.tsx'));

    const direct = join(dirAbs, parts[i]);
    if (existsSync(direct) && walk(direct, i + 1)) return true;

    let entries;
    try {
      entries = readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const e of entries) {
      if (e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')')) {
        if (walk(join(dirAbs, e.name), i)) return true;
      }
    }
    return false;
  };

  return walk(join(ROOT, 'apps/web/src/app'), 0);
}
