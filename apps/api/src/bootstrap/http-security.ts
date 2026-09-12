import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/** Register before app.init/listen so every response receives security headers. */
export function configureHttpSecurity(app: INestApplication, prefix: string): void {
  const production = process.env.NODE_ENV === 'production';
  app.use(helmet({
    strictTransportSecurity: production,
    contentSecurityPolicy: {
      directives: {
        // Swagger's development UI can initialize inline; production keeps Helmet's default.
        ...(production ? {} : { scriptSrc: ["'self'", "'unsafe-inline'"] }),
        // Do not upgrade localhost HTTP assets to HTTPS during development.
        upgradeInsecureRequests: production ? [] : null,
      },
    },
  }));

  if (!production) {
    const swagger = new DocumentBuilder()
      .setTitle('HSK Learning Platform API')
      .setDescription('Admin surface. Only the modules whose specs are unblocked are implemented.')
      .setVersion('1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swagger));
  }
}
