import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { ApplicationsService } from './applications.service.js';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}
  @Get() list(@Req() req: any) {
    return this.applications.list(req.user.role);
  }
  @Get('orders/list') orders(@Req() req: any) {
    return this.applications.listOrders(req.user.sub, req.user.role);
  }
  @Get(':id') get(@Req() req: any, @Param('id') id: string) {
    return this.applications.get(id, req.user.role);
  }
  @Post() create(@Req() req: any, @Body() body: any) {
    this.ensureAdmin(req);
    return this.applications.create(req.user.sub, body);
  }
  @Patch(':id') update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    this.ensureAdmin(req);
    return this.applications.update(id, body);
  }
  @Post(':id/status') status(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'PUBLISHED' | 'OFFLINE' | 'DRAFT' },
  ) {
    this.ensureAdmin(req);
    return this.applications.setStatus(id, body.status);
  }
  @Delete(':id') remove(@Req() req: any, @Param('id') id: string) {
    this.ensureAdmin(req);
    return this.applications.remove(id);
  }
  @Post(':id/order') order(@Req() req: any, @Param('id') id: string) {
    return this.applications.order(req.user.sub, id);
  }
  @Post('orders/:orderId/submit') submit(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() body: { content: unknown },
  ) {
    return this.applications.submit(req.user.sub, orderId, body.content);
  }
  @Post('orders/:orderId/image') uploadImage(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() body: { imageData: string },
  ) {
    return this.applications.uploadOrderImage(
      req.user.sub,
      req.user.role,
      orderId,
      body.imageData,
    );
  }
  private ensureAdmin(req: any) {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role))
      throw new ForbiddenException();
  }
}
