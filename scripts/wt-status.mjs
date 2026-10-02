#!/usr/bin/env node
/**
 * wt-status.mjs — one table that answers "what is every agent doing right now?".
 *
 * Read-only: it runs `git` and (optionally) `gh`, and never changes a worktree, branch or PR.
 *
 * Run:  pnpm wt:status            human table, always exits 0
 *       pnpm wt:status --strict   exits 1 when anything is flagged (for a daily check)
 *       pnpm wt:status --offline  skip `git fetch` and `gh` (PR column shows "?")
 *
 * Flags, in the order they are worth looking at:
 *   DIRTY      uncommitted files — an agent stopped without a WIP commit
 *   DETACHED   HEAD is not on a branch, so the work has no name and no PR
 *   MAIN-OFF   the primary checkout is not on `main` (it should never hold a feature branch)
 *   MERGED     its PR is merged (or the branch is already in origin/main) — delete it and
 *              archive the worktree; "ahead" commits left over from a squash are expected
 *   STALE      last commit older than STALE_DAYS and no open PR — finish it or delete it
 *   BEHIND     more than BEHIND_LIMIT commits behind origin/main
 */
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const STALE_DAYS = 3;
const BEHIND_LIMIT = 50;
const MAIN_BRANCH = 'main';
const REMOTE_MAIN = `origin/${MAIN_BRANCH}`;

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const offline = args.has('--offline');

function run(cmd, cmdArgs, cwd) {
  try {
    return execFileSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const git = (cwd, ...a) => run('git', a, cwd);

if (git(process.cwd(), 'rev-parse', '--git-dir') === null) {
  console.error('wt-status: not inside a git repository.');
  process.exit(2);
}

if (!offline) git(process.cwd(), 'fetch', '--quiet', 'origin');

/** `git worktree list --porcelain` -> [{ path, head, branch|null }] (first entry = primary checkout). */
function listWorktrees() {
  const raw = git(process.cwd(), 'worktree', 'list', '--porcelain') ?? '';
  const out = [];
  for (const block of raw.split(/\r?\n\r?\n/)) {
    if (!block.trim()) continue;
    const wt = { path: '', head: '', branch: null };
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('worktree ')) wt.path = line.slice(9);
      else if (line.startsWith('HEAD ')) wt.head = line.slice(5);
      else if (line.startsWith('branch ')) wt.branch = line.slice(7).replace(/^refs\/heads\//, '');
    }
    if (wt.path) out.push(wt);
  }
  return out;
}

/** branch -> { number, state, draft } for the newest PR of each head branch, or null when gh is unavailable. */
function loadPullRequests() {
  if (offline) return null;
  const raw = run(
    'gh',
    ['pr', 'list', '--state', 'all', '--limit', '200', '--json', 'number,state,isDraft,headRefName,updatedAt'],
    process.cwd(),
  );
  if (raw === null) return null;
  try {
    const byBranch = new Map();
    for (const pr of JSON.parse(raw)) {
      const seen = byBranch.get(pr.headRefName);
      if (!seen || pr.updatedAt > seen.updatedAt) byBranch.set(pr.headRefName, pr);
    }
    return byBranch;
  } catch {
    return null;
  }
}

const worktrees = listWorktrees();
const prs = loadPullRequests();
const now = Date.now() / 1000;

const rows = worktrees.map((wt, i) => {
  const flags = [];
  const dirty = (git(wt.path, 'status', '--porcelain') ?? '').split(/\r?\n/).filter(Boolean).length;
  const lastTs = Number(git(wt.path, 'log', '-1', '--format=%ct') ?? 0);
  const ageDays = lastTs ? Math.floor((now - lastTs) / 86400) : null;
  const lastDate = lastTs ? new Date(lastTs * 1000).toISOString().slice(0, 10) : '?';

  const counts = git(wt.path, 'rev-list', '--left-right', '--count', `HEAD...${REMOTE_MAIN}`);
  const [ahead, behind] = counts ? counts.split(/\s+/).map(Number) : [NaN, NaN];

  const pr = prs && wt.branch ? prs.get(wt.branch) : undefined;
  let prLabel = '?';
  if (prs) {
    if (!wt.branch) prLabel = '-';
    else if (!pr) prLabel = 'none';
    else prLabel = `#${pr.number} ${pr.state === 'OPEN' ? (pr.isDraft ? 'draft' : 'open') : pr.state.toLowerCase()}`;
  }
  const hasOpenPr = pr?.state === 'OPEN';

  const merged = git(wt.path, 'merge-base', '--is-ancestor', 'HEAD', REMOTE_MAIN) !== null;
  const isPrimary = i === 0;

  if (dirty > 0) flags.push('DIRTY');
  if (!wt.branch) flags.push('DETACHED');
  if (isPrimary && wt.branch !== MAIN_BRANCH) flags.push('MAIN-OFF');
  // A squash/rebase merge leaves the branch's own commits "ahead" forever, so the PR state is
  // the primary signal; ancestry only catches plain merges when gh is unavailable.
  const landed = pr?.state === 'MERGED' || (merged && behind > 0);
  if (!isPrimary && wt.branch && landed) flags.push('MERGED');
  if (!isPrimary && !landed && ageDays !== null && ageDays > STALE_DAYS && !hasOpenPr) flags.push('STALE');
  if (behind > BEHIND_LIMIT) flags.push('BEHIND');

  return {
    name: isPrimary ? `${basename(wt.path)} (primary)` : basename(wt.path),
    branch: wt.branch ?? `(detached ${wt.head.slice(0, 7)})`,
    sync: Number.isNaN(ahead) ? '?' : `+${ahead}/-${behind}`,
    dirty: String(dirty),
    last: ageDays === null ? lastDate : `${lastDate} (${ageDays}d)`,
    pr: prLabel,
    flags: flags.join(' ') || 'ok',
    flagged: flags.length > 0,
  };
});

const cols = [
  ['WORKTREE', 'name'],
  ['BRANCH', 'branch'],
  ['AHEAD/BEHIND', 'sync'],
  ['DIRTY', 'dirty'],
  ['LAST COMMIT', 'last'],
  ['PR', 'pr'],
  ['FLAGS', 'flags'],
];
const widths = cols.map(([h, k]) => Math.max(h.length, ...rows.map((r) => r[k].length)));
const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();

console.log(line(cols.map(([h]) => h)));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const r of rows) console.log(line(cols.map(([, k]) => r[k])));

const flagged = rows.filter((r) => r.flagged).length;
console.log('');
console.log(
  `${rows.length} worktree(s), ${flagged} flagged. ` +
    `origin/main = ${git(process.cwd(), 'rev-parse', '--short', REMOTE_MAIN) ?? '?'}` +
    (prs ? '' : ' · PR column unavailable (gh missing, not logged in, or --offline)'),
);

if (strict && flagged > 0) process.exit(1);
