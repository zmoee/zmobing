import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { R2StorageService } from './r2-storage.service.js';

type ApplicationInput = {
  name: string;
  description?: string;
  coverUrl?: string | null;
  category?: string;
  price?: number;
  fields?: Array<{
    fieldKey?: string;
    description: string;
    type?: string;
    required?: boolean;
    config?: unknown;
  }>;
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2StorageService,
  ) {}
  async list(role: string) {
    return this.prisma.application.findMany({
      where: ['SUPER_ADMIN', 'ADMIN'].includes(role)
        ? {}
        : { status: 'PUBLISHED' },
      include: { fields: true, _count: { select: { orders: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  async get(id: string, role: string) {
    const item = await this.prisma.application.findUnique({
      where: { id },
      include: { fields: true },
    });
    if (!item) throw new NotFoundException('病例不存在');
    if (item.status !== 'PUBLISHED' && !['SUPER_ADMIN', 'ADMIN'].includes(role))
      throw new ForbiddenException();
    return item;
  }
  async create(userId: string, input: ApplicationInput) {
    if (!input.name?.trim()) throw new BadRequestException('请输入病例名称');
    return this.prisma.application.create({
      data: {
        name: input.name.trim(),
        description: input.description || '',
        coverUrl: input.coverUrl || null,
        category: input.category || '病历',
        price: Math.max(0, Math.floor(input.price || 0)),
        createdById: userId,
        fields: { create: this.normalizeFields(input.fields) },
      },
      include: { fields: true },
    });
  }
  async update(id: string, input: ApplicationInput) {
    if (!(await this.prisma.application.findUnique({ where: { id } })))
      throw new NotFoundException('病例不存在');
    return this.prisma.$transaction(async (tx) => {
      await tx.applicationField.deleteMany({ where: { applicationId: id } });
      return tx.application.update({
        where: { id },
        data: {
          name: input.name?.trim(),
          description: input.description,
          coverUrl: input.coverUrl,
          category: input.category,
          price:
            input.price === undefined
              ? undefined
              : Math.max(0, Math.floor(input.price)),
          fields: { create: this.normalizeFields(input.fields) },
        },
        include: { fields: true },
      });
    });
  }
  async setStatus(id: string, status: 'PUBLISHED' | 'OFFLINE' | 'DRAFT') {
    return this.prisma.application.update({
      where: { id },
      data: {
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
      },
    });
  }
  async remove(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!application) throw new NotFoundException('病例不存在');
    await this.prisma.$transaction(async (tx) => {
      await tx.applicationOrder.deleteMany({ where: { applicationId: id } });
      await tx.applicationField.deleteMany({ where: { applicationId: id } });
      await tx.application.delete({ where: { id } });
    });
    return { message: '病例已删除' };
  }
  async order(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({ where: { id } });
      if (!application || application.status !== 'PUBLISHED')
        throw new BadRequestException('病例暂不可用');
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.balance < application.price)
        throw new BadRequestException('余额不足');
      const balanceBefore = user.balance;
      const balanceAfter = balanceBefore - application.price;
      if (application.price > 0)
        await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: application.price } },
        });
      return tx.applicationOrder.create({
        data: {
          applicationId: id,
          userId,
          price: application.price,
          balanceBefore,
          balanceAfter,
        },
        include: { application: true },
      });
    });
  }
  async submit(userId: string, orderId: string, content: unknown) {
    const order = await this.prisma.applicationOrder.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return this.prisma.applicationOrder.update({
      where: { id: orderId },
      data: { content: content as object, status: 'SUBMITTED' },
    });
  }
  async listOrders(userId: string, role: string) {
    const orders = await this.prisma.applicationOrder.findMany({
      where: role === 'SUPER_ADMIN' ? {} : { userId },
      select: {
        id: true,
        applicationId: true,
        userId: true,
        price: true,
        balanceBefore: true,
        balanceAfter: true,
        imageKey: true,
        imageContentType: true,
        imageUploadedAt: true,
        imageExpiresAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        application: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    orders.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return Promise.all(
      orders.map(async (order) => {
        let imageUrl: string | null = null;
        if (
          order.imageKey &&
          (!order.imageExpiresAt || order.imageExpiresAt > new Date())
        ) {
          try {
            imageUrl = await this.r2.getSignedUrl(order.imageKey);
          } catch {
            imageUrl = null;
          }
        }
        return { ...order, imageUrl };
      }),
    );
  }
  async uploadOrderImage(
    userId: string,
    role: string,
    orderId: string,
    imageData: string,
  ) {
    const order = await this.prisma.applicationOrder.findFirst({
      where: role === 'SUPER_ADMIN' ? { id: orderId } : { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    const key = `orders/${order.id}/preview.png`;
    const uploaded = await this.r2.uploadDataUrl(key, imageData);
    const imageExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.applicationOrder.update({
      where: { id: order.id },
      data: {
        imageKey: uploaded.key,
        imageContentType: uploaded.contentType,
        imageUploadedAt: new Date(),
        imageExpiresAt,
      },
    });
    return {
      ...updated,
      imageUrl: await this.r2.getSignedUrl(key),
    };
  }
  private normalizeFields(fields: ApplicationInput['fields'] = []) {
    return fields.map((field, index) => ({
      fieldKey: field.fieldKey || `field_${index + 1}`,
      description: field.description || `字段${index + 1}`,
      type: field.type || 'text',
      required: !!field.required,
      config: (field.config || {}) as object,
    }));
  }
}
