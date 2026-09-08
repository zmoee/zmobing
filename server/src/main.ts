import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module.js';
import { AuthService } from './auth.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.get(AuthService).seedSuperAdmin();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
