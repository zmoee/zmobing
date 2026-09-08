import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly auth: AuthService) {}
  @Get('me') me(@Req() req: any) {
    return this.auth.getUserSummary(req.user.sub);
  }
  @Get() list(@Req() req: any) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) throw new ForbiddenException();
    return this.auth.listUsers(req.user.sub, req.user.role);
  }
  @Post() create(@Req() req: any, @Body() body: { email: string; name: string; password: string; role?: 'ADMIN' | 'USER' }) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) throw new ForbiddenException();
    if (req.user.role !== 'SUPER_ADMIN' && body.role === 'ADMIN') throw new ForbiddenException();
    return this.auth.createUser(req.user.sub, body);
  }
  @Post('invite/verification') sendInviteVerification(@Req() req: any, @Body() body: { email: string }) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) throw new ForbiddenException();
    return this.auth.sendInviteVerification(req.user.sub, body.email);
  }
  @Post('invite/verification/confirm') verifyInviteVerification(@Req() req: any, @Body() body: { email: string; code: string }) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) throw new ForbiddenException();
    return this.auth.verifyInviteVerification(req.user.sub, body.email, body.code);
  }
  @Post('invite') invite(@Req() req: any, @Body() body: { email: string; role: 'ADMIN' | 'USER'; verificationToken: string }) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) throw new ForbiddenException();
    if (req.user.role !== 'SUPER_ADMIN' && body.role === 'ADMIN') throw new ForbiddenException();
    return this.auth.inviteUser(req.user.sub, body);
  }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() body: { email?: string; balanceDelta?: number; role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER'; password?: string; active?: boolean }) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) throw new ForbiddenException();
    if (req.user.role === 'ADMIN' && ['SUPER_ADMIN', 'ADMIN'].includes(body.role || 'USER')) throw new ForbiddenException();
    return this.auth.updateUser(id, body);
  }
}
