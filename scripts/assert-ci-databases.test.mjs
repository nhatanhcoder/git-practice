import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('CI database guard accepts disposable targets and rejects developer/remote targets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hsk-ci-guard-'));
  mkdirSync(join(dir, 'scripts'));
  const script = join(dir, 'scripts', 'assert-ci-databases.mjs');
  copyFileSync(new URL('./assert-ci-databases.mjs', import.meta.url), script);
  const env = {
    ...process.env,
    CI: 'true',
    DATABASE_URL: 'postgresql://ci:fixture@127.0.0.1:5432/hsk_ci',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/hsk_ci',
  };
  const run = (overrides = {}) => spawnSync(process.execPath, [script], {
    env: { ...env, ...overrides }, encoding: 'utf8',
  });
  try {
    assert.equal(run().status, 0);
    for (const overrides of [
      { CI: 'false' },
      { DATABASE_URL: 'postgresql://ci:fixture@db.example.com:5432/hsk_ci' },
      { DATABASE_URL: 'postgresql://ci:fixture@127.0.0.1:5432/hsk_dev' },
      { DATABASE_URL: `${env.DATABASE_URL}?schema=public` },
      { MONGODB_URI: 'mongodb+srv://remote.example.com/hsk_ci' },
      { MONGODB_URI: 'mongodb://127.0.0.1:27017/hsk_dev' },
      { MONGODB_URI: 'mongodb://127.0.0.1:27018/hsk_ci' },
    ]) {
      const result = run(overrides);
      assert.notEqual(result.status, 0);
      assert.ok(!result.stderr.includes('fixture'), 'must not print connection credentials');
    }
    writeFileSync(join(dir, '.env'), 'DATABASE_URL=developer-database');
    assert.notEqual(run().status, 0, 'a developer .env must block CI database work');
  } finally {
    // Exact directory created by mkdtemp above, never a workspace or user directory.
    rmSync(dir, { recursive: true, force: true });
  }
});
