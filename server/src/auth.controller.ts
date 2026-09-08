import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(@Body() body: { email: string; password: string }) { return this.auth.login(body.email, body.password); }
  @Post('forgot-password') requestReset(@Body() body: { email: string }) { return this.auth.requestPasswordReset(body.email); }
  @Post('reset-password') resetPassword(@Body() body: { email: string; code: string; password: string }) { return this.auth.resetPassword(body.email, body.code, body.password); }
  @UseGuards(JwtAuthGuard)
  @Get('me') me(@Req() req: any) { return req.user; }
}
