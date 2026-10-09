import {
  BadRequestException,
  INestApplication,
  PayloadTooLargeException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import { REFRESH_COOKIE } from '../auth/auth.constants';
import { json } from 'express';
import { JSON_BODY_LIMIT } from '../security/rate-limit.policy';

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
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN'),
    credentials: true,
    exposedHeaders: [
      'Retry-After',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  });
  const parseJson = json({ limit: JSON_BODY_LIMIT });
  app.use((request: Request, response: Response, next: NextFunction) => {
    parseJson(request, response, (error: unknown) => {
      if (error && typeof error === 'object' && 'type' in error) {
        if (error.type === 'entity.too.large') return next(new PayloadTooLargeException());
        if (error.type === 'entity.parse.failed') return next(new BadRequestException());
      }
      next(error);
    });
  });
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
      .setDescription(
        'API del marketplace: autenticación, negocios, categorías y productos del vendedor con imágenes.',
      )
      .addBearerAuth()
      .addCookieAuth(REFRESH_COOKIE)
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, builder);
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });
  }
}
