import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'node:path';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // One .env at the repo root — the same file docker-compose reads, so the
      // container's credentials and the API's DATABASE_URL cannot drift apart.
      envFilePath: join(__dirname, '../../../.env'),
    }),

    PrismaModule,

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error('MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
        }
        if (uri.includes('<PASSWORD>') || uri.includes('<CLUSTER>')) {
          throw new Error('MONGODB_URI still has the .env.example placeholders in it.');
        }

        const logger = new Logger('MongooseModule');
        return {
          uri,
          // Atlas over the public internet: fail fast and say so, rather than
          // hanging for the driver's 30s default while the API looks alive.
          serverSelectionTimeoutMS: 8000,
          onConnectionCreate: () => logger.log('MongoDB (Atlas) connected'),
        };
      },
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
