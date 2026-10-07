import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import { REFRESH_COOKIE } from '../auth/auth.constants';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.use('/api/v1/auth', (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');
    next();
  });
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
      exceptionFactory: () =>
        new BadRequestException({
          message: 'Los datos enviados no son válidos',
          error: 'VALIDATION_ERROR',
        }),
    }),
  );
  if (config.getOrThrow<boolean>('SWAGGER_ENABLED')) {
    const builder = new DocumentBuilder()
      .setTitle('PatziShop API')
      .setDescription('API del marketplace: salud y autenticación con JWT y sesiones rotativas.')
      .addBearerAuth()
      .addCookieAuth(REFRESH_COOKIE)
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, builder);
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });
  }
}
