import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';

/**
 * GET /health — proves both databases are actually reachable from the running
 * API, not merely configured. Always returns 200 with a per-database verdict;
 * making the whole endpoint 503 when one store is down hides which one it is.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectConnection() private readonly mongo: Connection,
  ) {}

  @Get()
  async check() {
    const [postgres, mongodb] = await Promise.all([this.checkPostgres(), this.checkMongo()]);

    return {
      status: postgres.up && mongodb.up ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      databases: { postgres, mongodb },
    };
  }

  private async checkPostgres() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { up: true };
    } catch (e) {
      return { up: false, error: e instanceof Error ? e.message.split('\n')[0] : String(e) };
    }
  }

  private async checkMongo() {
    try {
      // readyState 1 means connected, but the socket can be stale; a ping is the
      // only answer that means the server replied just now.
      const db = this.mongo.db;
      if (!db) {
        return { up: false, error: 'no database handle on the mongoose connection' };
      }
      await db.admin().ping();
      return { up: true };
    } catch (e) {
      return { up: false, error: e instanceof Error ? e.message.split('\n')[0] : String(e) };
    }
  }
}
