require('reflect-metadata');
const { Controller, Get, Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { installGracefulShutdown } = require('../../dist/src/bootstrap/graceful-shutdown');
let destroyed = false;
class Resource {
  onModuleDestroy() { destroyed = true; process.send({ event: 'destroyed' }); }
  onApplicationShutdown() { process.send({ event: 'closed' }); process.disconnect(); }
}
class SlowController {
  async slow() {
    process.send({ event: 'started' });
    await new Promise(resolve => setTimeout(resolve, 200));
    return { resourceStillOpen: !destroyed };
  }
}
Controller('slow')(SlowController);
Get()(SlowController.prototype, 'slow', Object.getOwnPropertyDescriptor(SlowController.prototype, 'slow'));
class FixtureModule {}
Module({ controllers: [SlowController], providers: [Resource] })(FixtureModule);
(async () => {
  const app = await NestFactory.create(FixtureModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  installGracefulShutdown(app);
  process.on('message', message => {
    // Windows cannot deliver POSIX SIGTERM; exercise the same handler explicitly.
    if (message === 'stop') process.emit('SIGTERM', 'SIGTERM');
  });
  process.send({ event: 'ready', port: app.getHttpServer().address().port });
})().catch(error => { console.error(error); process.exit(1); });
