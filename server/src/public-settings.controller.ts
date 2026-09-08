import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 1 },
      select: {
        siteName: true,
        watermarkText: true,
        watermarkOpacity: true,
        watermarkFontSize: true,
        watermarkColor: true,
      },
    });
    return {
      siteName: settings?.siteName || '周末病历系统',
      watermarkText: settings?.watermarkText || '',
      watermarkOpacity: settings?.watermarkOpacity ?? 0.16,
      watermarkFontSize: settings?.watermarkFontSize ?? 18,
      watermarkColor: '#ef4444',
    };
  }
}
