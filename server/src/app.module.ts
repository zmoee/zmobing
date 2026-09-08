import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersController } from './users.controller.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { SettingsController } from './settings.controller.js';
import { PublicSettingsController } from './public-settings.controller.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { R2StorageService } from './r2-storage.service.js';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'dev-secret', signOptions: { expiresIn: '8h' } })],
  controllers: [AppController, AuthController, UsersController, SettingsController, PublicSettingsController, ApplicationsController],
  providers: [AppService, PrismaService, AuthService, JwtAuthGuard, ApplicationsService, R2StorageService],
})
export class AppModule {}
