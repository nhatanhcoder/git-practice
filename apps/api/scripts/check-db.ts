/**
 * Connectivity check for both databases. Run it before blaming the app:
 *
 *     pnpm --filter api db:check
 *
 * Exit code 0 = both reachable, 1 = at least one is not. Failures print the
 * likely cause rather than the raw driver error, because the raw errors for
 * "container not started" and "wrong password" look nearly identical.
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

// One .env for the whole repo, at the root, so docker-compose and the API cannot
// drift apart. Everything here resolves against that single file.
config({ path: resolve(__dirname, '../../../.env') });

type Result = { name: string; ok: boolean; detail: string };

async function checkPostgres(): Promise<Result> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { name: 'PostgreSQL', ok: false, detail: 'DATABASE_URL is not set — did you copy .env.example to .env?' };
  }

  const prisma = new PrismaClient();
  try {
    const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
    const userCount = await prisma.user.count();
    return {
      name: 'PostgreSQL',
      ok: true,
      detail: `${version.split(',')[0]} — users table has ${userCount} row(s)`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let hint = msg.split('\n')[0];

    if (msg.includes('ECONNREFUSED') || msg.includes("Can't reach database server")) {
      hint = 'nothing is listening — start the container: docker compose up -d';
    } else if (msg.includes('password authentication failed')) {
      hint = 'wrong credentials — DATABASE_URL disagrees with POSTGRES_USER/POSTGRES_PASSWORD in .env';
    } else if (msg.includes('does not exist') && msg.includes('database')) {
      hint = 'the database name in DATABASE_URL does not match POSTGRES_DB';
    } else if (msg.includes('users') && msg.includes('does not exist')) {
      hint = 'connected, but the schema is not applied — run: pnpm --filter api db:migrate';
    }
    return { name: 'PostgreSQL', ok: false, detail: hint };
  } finally {
    await prisma.$disconnect();
  }
}

async function checkMongo(): Promise<Result> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { name: 'MongoDB', ok: false, detail: 'MONGODB_URI is not set' };
  }
  if (uri.includes('<PASSWORD>') || uri.includes('<CLUSTER>')) {
    return { name: 'MongoDB', ok: false, detail: 'MONGODB_URI still contains the placeholders from .env.example' };
  }

  try {
    // 8s beats the driver's 30s default: a blocked IP otherwise looks like a hang.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

    const db = mongoose.connection.db;
    if (!db) {
      return { name: 'MongoDB', ok: false, detail: 'connect() resolved but no database handle — is a database name missing from the URI?' };
    }
    const { version } = await db.admin().serverStatus();
    return {
      name: 'MongoDB',
      ok: true,
      detail: `Atlas ${version} — database "${mongoose.connection.name}"`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let hint = msg.split('\n')[0];

    if (msg.includes('Authentication failed') || msg.includes('bad auth')) {
      hint = 'auth failed — wrong password, or it contains @ : / ? # and needs percent-encoding';
    } else if (msg.includes('ENOTFOUND') || msg.includes('querySrv')) {
      hint = 'cluster hostname not resolving — check the host in MONGODB_URI, and that you are online';
    } else if (msg.includes('timed out') || msg.includes('ServerSelection')) {
      hint = 'reachable but not selectable — your current IP is probably not in Atlas > Network Access';
    }
    return { name: 'MongoDB', ok: false, detail: hint };
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

async function main() {
  const results = await Promise.all([checkPostgres(), checkMongo()]);

  console.log('');
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'}  ${r.name.padEnd(11)} ${r.detail}`);
  }
  console.log('');

  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main();
