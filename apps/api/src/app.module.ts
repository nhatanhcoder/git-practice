import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'node:path';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { LessonsModule } from './lessons/lessons.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),

    PrismaModule,
    AuthModule,
    ClassesModule,
    LessonsModule,

    // Global so any guard can verify an access token without each feature module
    // re-registering it. Only verification lives here — nothing issues tokens yet:
    // 01-auth.md §12 says "No coding before the table is locked", and RefreshToken
    // is still unapproved. Signing stays out until that decision lands.
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is missing from .env — see docs/api/modules/01-auth.md');
        }
        // Verification only — no signOptions, because nothing here signs a token.
        // JWT_ACCESS_TTL belongs with the login endpoint that will mint them.
        return { secret };
      },
    }),

    UsersModule,

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
  providers: [
    // Registered globally, in this order, so authentication is the default and a route
    // that forgets to declare a guard fails closed rather than open. Opting out is
    // explicit and visible at the route: @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
