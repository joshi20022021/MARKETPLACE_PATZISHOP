import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './config/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  try {
    configureApp(app);
    app.enableShutdownHooks();
    const config = app.get(ConfigService);
    await app.listen(config.getOrThrow<number>('PORT'), config.getOrThrow<string>('HOST'));
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch(() => {
  Logger.error(
    'No se pudo iniciar la API. Revisa la configuración, PostgreSQL y el puerto.',
    'Bootstrap',
  );
  process.exitCode = 1;
});
