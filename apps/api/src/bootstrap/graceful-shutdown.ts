import { Logger, type INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';

/**
 * Nest's automatic signal hooks destroy providers before closing HTTP. Drain first
 * so an accepted request can still use Prisma until its response is complete.
 * app.close() then runs every Nest lifecycle hook, including Mongoose's.
 */
export function installGracefulShutdown(app: INestApplication, graceMs = 30_000): void {
  const server = app.getHttpServer() as Server;
  const logger = new Logger('Shutdown');
  let stopping = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) return;
    stopping = true;
    logger.log(`${signal}: draining HTTP requests`);
    const deadline = setTimeout(() => {
      logger.warn('HTTP drain deadline exceeded; closing remaining connections');
      server.closeAllConnections();
    }, graceMs);
    deadline.unref();
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => {
          if (error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
          else resolve();
        });
      });
      clearTimeout(deadline);
      await app.close();
      logger.log('HTTP drained and application resources closed');
    } catch (error) {
      logger.error('Graceful shutdown failed', error);
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
      process.off('SIGTERM', onTerm);
      process.off('SIGINT', onInt);
    }
  };
  const onTerm = (): void => { void shutdown('SIGTERM'); };
  const onInt = (): void => { void shutdown('SIGINT'); };
  // Do not also enable Nest's automatic signal hooks: they would race this drain.
  process.on('SIGTERM', onTerm);
  process.on('SIGINT', onInt);
}
