import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/src/app.module';
import { configureHttpSecurity } from '../dist/src/bootstrap/http-security';
import { GlobalExceptionFilter } from '../dist/src/common/filters/global-exception.filter';

// Run with the existing isolated test:ci database guard; never points at developer data.
test('security middleware preserves real health, login and refresh responses', async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    configureHttpSecurity(app, 'api/v1');
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const health = await fetch(`${base}/api/v1/health`);
    assert.equal(health.status, 200);
    const body = await health.json();
    assert.equal(body.databases.postgres.up, true);
    assert.equal(body.databases.mongodb.up, true);
    for (const path of ['login', 'refresh']) {
      const response = await fetch(`${base}/api/v1/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bootstrap-probe@example.invalid', password: 'wrong-password' }),
      });
      assert.equal(response.status, 401, path);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
  } finally {
    await app.close();
  }
});
