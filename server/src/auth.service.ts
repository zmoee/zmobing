import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service.js';
import { randomBytes } from 'node:crypto';
import { createHash, randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async seedSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!email || !password) return;
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (!exists) await this.prisma.user.create({ data: { email, name: '超级管理员', role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(password, 12) } });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || (!user.active && !user.invited) || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('邮箱或密码错误');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastOnlineAt: new Date(), active: true, invited: false } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, email: user.email });
    return { accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('该邮箱未注册');
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPassword || !settings.smtpFrom) throw new BadRequestException('请先完整配置 SMTP 邮件服务');
    const code = String(randomInt(100000, 1000000));
    await this.prisma.passwordReset.deleteMany({ where: { email } });
    await this.prisma.passwordReset.create({ data: { email, codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    const transporter = nodemailer.createTransport({ host: settings.smtpHost, port: settings.smtpPort, secure: settings.smtpPort === 465, auth: { user: settings.smtpUser, pass: settings.smtpPassword } });
    await transporter.sendMail({ from: settings.smtpFrom, to: email, subject: `${settings.siteName} 密码重置验证码`, text: `您的密码重置验证码是：${code}，10分钟内有效。` });
    return { message: '验证码已发送' };
  }
  async resetPassword(email: string, code: string, password: string) {
    if (password.length < 8) throw new BadRequestException('密码至少需要 8 个字符');
    const reset = await this.prisma.passwordReset.findFirst({ where: { email, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!reset || reset.codeHash !== createHash('sha256').update(code).digest('hex')) throw new UnauthorizedException('验证码错误或已过期');
    await this.prisma.user.update({ where: { email }, data: { passwordHash: await bcrypt.hash(password, 12), active: true, invited: false } });
    await this.prisma.passwordReset.delete({ where: { id: reset.id } });
    return { message: '密码已重置' };
  }

  async listUsers(userId: string, role: string) {
    return this.prisma.user.findMany({
      where: role === 'SUPER_ADMIN' ? {} : { invitedById: userId },
      select: { id: true, email: true, name: true, balance: true, totalRecharge: true, lastOnlineAt: true, role: true, active: true, invited: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async getUserSummary(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, balance: true, totalRecharge: true },
    });
  }
  async createUser(userId: string, data: { email: string; name: string; password: string; role?: 'ADMIN' | 'USER' }) {
    return this.prisma.user.create({ data: { email: data.email, name: data.name, role: data.role || 'USER', invitedById: userId, passwordHash: await bcrypt.hash(data.password, 12) }, select: { id: true, email: true, name: true, balance: true, totalRecharge: true, lastOnlineAt: true, role: true, active: true } });
  }
  async sendInviteVerification(inviterId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (settings && !settings.inviteEnabled) throw new BadRequestException('邀请用户功能已关闭');
    if (!settings?.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword || !settings.smtpFrom) {
      throw new BadRequestException('请先完整配置 SMTP 邮件服务');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new BadRequestException('该邮箱已注册或已被邀请');
    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: inviterId } });
    if (inviter.balance < (settings.inviteCost || 0)) throw new BadRequestException('积分不足，无法邀请用户');
    const key = `invite:${inviterId}:${normalizedEmail}`;
    const code = String(randomInt(1000, 10000));
    await this.prisma.passwordReset.deleteMany({ where: { email: key } });
    await this.prisma.passwordReset.create({ data: { email: key, codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    try {
      const transporter = nodemailer.createTransport({ host: settings.smtpHost, port: settings.smtpPort, secure: settings.smtpPort === 465, auth: { user: settings.smtpUser, pass: settings.smtpPassword } });
      await transporter.sendMail({ from: settings.smtpFrom, to: normalizedEmail, subject: `${settings.siteName} 邀请验证码`, text: `您的邀请验证码是：${code}，10分钟内有效。` });
      return { message: '验证码已发送' };
    } catch {
      await this.prisma.passwordReset.deleteMany({ where: { email: key } });
      throw new BadRequestException('验证码邮件发送失败，请检查 SMTP 配置');
    }
  }
  async verifyInviteVerification(inviterId: string, email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `invite:${inviterId}:${normalizedEmail}`;
    const verification = await this.prisma.passwordReset.findFirst({ where: { email: key, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!verification || verification.codeHash !== createHash('sha256').update(code.trim()).digest('hex')) throw new UnauthorizedException('验证码错误或已过期');
    await this.prisma.passwordReset.delete({ where: { id: verification.id } });
    return { verificationToken: await this.jwt.signAsync({ purpose: 'invite-verification', sub: inviterId, email: normalizedEmail }, { expiresIn: '10m' }) };
  }
  async inviteUser(inviterId: string, data: { email: string; role: 'ADMIN' | 'USER'; verificationToken: string }) {
    let verification: { purpose?: string; sub?: string; email?: string };
    try { verification = await this.jwt.verifyAsync(data.verificationToken); } catch { throw new UnauthorizedException('邀请验证已失效，请重新验证邮箱'); }
    const normalizedEmail = data.email.trim().toLowerCase();
    if (verification.purpose !== 'invite-verification' || verification.sub !== inviterId || verification.email !== normalizedEmail) throw new UnauthorizedException('邀请验证无效，请重新验证邮箱');
    const temporaryPassword = randomBytes(12).toString('base64url');
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (settings && !settings.inviteEnabled) throw new BadRequestException('邀请用户功能已关闭');
    const inviter = await this.prisma.user.findUniqueOrThrow({ where: { id: inviterId } });
    if (settings && inviter.balance < settings.inviteCost) throw new BadRequestException('积分不足，无法邀请用户');
    if (!settings?.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword || !settings.smtpFrom) {
      throw new BadRequestException('请先完整配置 SMTP 邮件服务');
    }
    const user = await this.prisma.$transaction(async (tx) => {
      if (settings && settings.inviteCost > 0) await tx.user.update({ where: { id: inviterId }, data: { balance: { decrement: settings.inviteCost } } });
      return tx.user.create({ data: { email: normalizedEmail, name: normalizedEmail.split('@')[0], role: data.role, active: false, invited: true, invitedById: inviterId, balance: settings?.inviteCost || 0, totalRecharge: settings?.inviteCost || 0, passwordHash: await bcrypt.hash(temporaryPassword, 12) }, select: { id: true, email: true, name: true, balance: true, totalRecharge: true, role: true, active: true, invited: true, createdAt: true } });
    });
    try {
      const transporter = nodemailer.createTransport({ host: settings.smtpHost, port: settings.smtpPort, secure: settings.smtpPort === 465, auth: { user: settings.smtpUser, pass: settings.smtpPassword } });
      const loginUrl = `${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}/sign`;
      await transporter.sendMail({
        from: settings.smtpFrom,
        to: data.email,
        subject: `${settings.siteName} 邀请登录通知`,
        text: `您好，您已被邀请使用${settings.siteName}。\n\n登录邮箱：${data.email}\n临时密码：${temporaryPassword}\n登录网址：${loginUrl}\n\n首次登录后请及时修改密码。`,
        html: `<p>您好，您已被邀请使用 <strong>${settings.siteName}</strong>。</p><p>登录邮箱：${data.email}<br>临时密码：${temporaryPassword}<br>登录网址：<a href="${loginUrl}">${loginUrl}</a></p><p>首次登录后请及时修改密码。</p>`,
      });
      return user;
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } });
      if (settings && settings.inviteCost > 0) await this.prisma.user.update({ where: { id: inviterId }, data: { balance: { increment: settings.inviteCost } } });
      throw new BadRequestException('邀请邮件发送失败，请检查 SMTP 配置');
    }
  }
  async updateUser(id: string, data: { email?: string; balanceDelta?: number; role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER'; password?: string; active?: boolean }) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (data.balanceDelta && user.balance + data.balanceDelta < 0) throw new BadRequestException('余额不能为负数');
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        role: data.role,
        active: data.active,
        invited: data.active === true ? false : undefined,
        balance: data.balanceDelta ? user.balance + data.balanceDelta : undefined,
        totalRecharge: data.balanceDelta && data.balanceDelta > 0 ? user.totalRecharge + data.balanceDelta : undefined,
        passwordHash: data.password ? await bcrypt.hash(data.password, 12) : undefined,
      },
      select: { id: true, email: true, balance: true, totalRecharge: true, role: true, active: true, lastOnlineAt: true },
    });
  }
}
