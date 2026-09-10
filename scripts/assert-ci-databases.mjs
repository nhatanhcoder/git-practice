import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Run before migrations/seed as well as tests. Never print connection strings.
assert.equal(process.env.CI, 'true', 'The CI database runner requires CI=true.');
assert.equal(existsSync(fileURLToPath(new URL('../.env', import.meta.url))), false,
  'Refusing CI database work while a root .env exists.');
for (const [key, protocol, port] of [
  ['DATABASE_URL', 'postgresql:', '5432'],
  ['MONGODB_URI', 'mongodb:', '27017'],
]) {
  const url = new URL(process.env[key] ?? 'invalid');
  assert.equal(url.protocol, protocol, `${key}: unexpected protocol`);
  assert.equal(url.hostname, '127.0.0.1', `${key}: only runner-local services are allowed`);
  assert.equal(url.port, port, `${key}: unexpected port`);
  assert.equal(url.pathname, '/hsk_ci', `${key}: only hsk_ci may be used`);
  assert.equal(url.search, '', `${key}: connection overrides are forbidden`);
}
console.log('CI database targets verified: runner-local hsk_ci services; no root .env.');
