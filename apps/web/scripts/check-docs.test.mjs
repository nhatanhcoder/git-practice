import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = process.cwd();
const checkDocsScript = join(repoRoot, 'scripts', 'check-docs.mjs');

function write(root, path, contents) {
  const target = join(root, path);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, contents);
}

test('ignored local skills do not make clean CI and local checks disagree', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'check-docs-'));

  try {
    mkdirSync(join(fixture, 'scripts'), { recursive: true });
    cpSync(checkDocsScript, join(fixture, 'scripts', 'check-docs.mjs'));

    const sharedBody = 'Project context lives in `ai/context/project-brain.md`.\n';
    write(
      fixture,
      'AGENTS.md',
      `${sharedBody}Use \`.agents/skills/ui-ux-pro-max/SKILL.md\`.\n`,
    );
    write(
      fixture,
      'CLAUDE.md',
      `${sharedBody}Use \`.agents/skills/ui-ux-pro-max/SKILL.md\`.\n`,
    );
    write(
      fixture,
      '.gitignore',
      '.agents/skills/ui-ux-pro-max/\n.agents/skills/slides/\n',
    );
    write(fixture, 'ai/context/project-brain.md', '# Project brain\n');
    write(
      fixture,
      '.agents/skills/slides/SKILL.md',
      '---\nname: slides\ndescription: Local vendored skill.\n---\n',
    );

    const result = spawnSync(process.execPath, ['scripts/check-docs.mjs'], {
      cwd: fixture,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /all 8 checks passed/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
