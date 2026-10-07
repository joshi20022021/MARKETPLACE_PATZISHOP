import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
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
      .setDescription('Base REST del marketplace. Actualmente solo endpoints de salud.')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, builder);
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });
  }
}
