import 'reflect-metadata';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { test } from 'node:test';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureHttpSecurity } from '../dist/src/bootstrap/http-security';

class ProbeController { health() { return { ok: true }; } }
Controller('health')(ProbeController);
Get()(ProbeController.prototype, 'health', Object.getOwnPropertyDescriptor(ProbeController.prototype, 'health')!);
class ProbeModule {}
Module({ controllers: [ProbeController] })(ProbeModule);

for (const env of ['development', 'production']) {
  test(`HTTP security and Swagger in ${env}`, async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    const app = await NestFactory.create(ProbeModule, { logger: false });
    try {
      app.setGlobalPrefix('api/v1');
      app.enableCors({ origin: 'http://localhost:3000', credentials: true });
      configureHttpSecurity(app, 'api/v1');
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const response = await fetch(`${base}/api/v1/health`, { headers: { Origin: 'http://localhost:3000' } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
      const csp = response.headers.get('content-security-policy')!;
      assert.match(csp, /frame-ancestors 'self'/);
      if (env === 'production') {
        assert.match(response.headers.get('strict-transport-security')!, /max-age=/);
        assert.match(csp, /script-src 'self';/);
      } else {
        assert.equal(response.headers.get('strict-transport-security'), null);
        assert.match(csp, /script-src 'self' 'unsafe-inline'/);
        assert.doesNotMatch(csp, /upgrade-insecure-requests/);
      }
      for (const path of ['docs', 'docs-json', 'docs-yaml', 'docs/swagger-ui-init.js']) {
        const docs = await fetch(`${base}/api/v1/${path}`);
        assert.equal(docs.status, env === 'production' ? 404 : 200, path);
        if (env === 'development' && path === 'docs') assert.match(await docs.text(), /swagger-ui/);
      }
    } finally {
      await app.close();
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
}

test('shutdown drains accepted requests before destroying providers and exits cleanly', { timeout: 15_000 }, async () => {
  const child = fork(join(process.cwd(), 'test/fixtures/shutdown.cjs'), [], { silent: true, execArgv: [] });
  const events: string[] = [];
  child.on('message', (message: { event: string }) => events.push(message.event));
  let output = '';
  child.stderr?.on('data', chunk => { output += chunk; });
  const exited = once(child, 'exit');
  try {
    const [ready] = await once(child, 'message') as [{ port: number; event: string }];
    assert.equal(ready.event, 'ready');
    const started = once(child, 'message');
    const response = fetch(`http://127.0.0.1:${ready.port}/slow`);
    assert.equal((await started)[0].event, 'started');
    if (process.platform === 'win32') child.send('stop');
    else child.kill('SIGTERM');
    assert.deepEqual(await (await response).json(), { resourceStillOpen: true });
    const [code, signal] = await exited;
    assert.equal(code, 0, output);
    assert.equal(signal, null);
    assert.deepEqual(events, ['ready', 'started', 'destroyed', 'closed']);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});
