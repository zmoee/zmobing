import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  private checkAccess(req: any) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role))
      throw new ForbiddenException();
  }

  @Get()
  async get(@Req() req: any) {
    this.checkAccess(req);
    return this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: {},
      update: {},
    });
  }

  @Patch()
  async update(
    @Req() req: any,
    @Body()
    body: {
      siteName: string;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword: string;
      smtpFrom: string;
      watermarkText?: string;
      watermarkOpacity?: number;
      watermarkFontSize?: number;
      watermarkColor?: string;
    },
  ) {
    this.checkAccess(req);
    return this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { ...body, watermarkColor: '#ef4444' },
      update: { ...body, watermarkColor: '#ef4444' },
    });
  }
}
