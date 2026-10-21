import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppConfig } from './config/app-config';
import { loadEnvFile } from './config/load-env';

async function bootstrap(): Promise<void> {
  loadEnvFile();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Payment webhooks are verified against the exact bytes the provider signed.
    rawBody: true,
  });
  configureApp(app);
  const { port } = app.get(AppConfig).http;
  await app.listen(port);
  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
