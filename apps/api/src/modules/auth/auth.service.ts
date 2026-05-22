import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async resolveUniqueUsername(name: string): Promise<string> {
    const baseUsername = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let username = baseUsername;
    let suffix = 1;

    while (
      await this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      })
    ) {
      username = `${baseUsername}-${suffix}`;
      suffix += 1;
    }
    return `@${username}`;
  }

  async generateTokens(dto: {
    id: string;
    email: string;
    role: string;
    deviceId?: string;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const jti = uuidv4();
    const deviceId = dto.deviceId ?? uuidv4();
    const payload = {
      id: dto.id,
      email: dto.email,
      role: dto.role,
      jti,
      deviceId,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
    });

    const refreshTokenHash = await argon2.hash(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenHash,
        userId: payload.id,
        deviceId,
        deviceName: dto.deviceName,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, deviceId };
  }

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.isActive) {
      throw new NotFoundException('Usuário não encontrado ou inativo.');
    }

    const code = await this.createOtpCode(
      user.email,

      user.id,
    );

    this.eventEmitter.emit('auth.email-verification.requested', {
      user,
      email: user.email,
      code,
    });

    return { message: 'Código de verificação enviado.' };
  }

  async verifyEmail(emailInput: string, code: string) {
    const email = String(emailInput).toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.isActive) {
      throw new NotFoundException('Usuário não encontrado ou inativo.');
    }

    await this.consumeOtpCode(email, 'verify Email', code);

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        entityType: 'User',
        entityId: user.id,
        newValues: { email },
      },
    });

    return { verified: true };
  }

  async createOtpCode(email: string, purpose: string, userId?: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));

    await this.prisma.otpCode.create({
      data: {
        email,
        userId,
        purpose,
        codeHash: await argon2.hash(code),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return code;
  }

  async consumeOtpCode(email: string, purpose: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        email,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.attempts >= 5) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    const isValid = await argon2.verify(otp.codeHash, String(code));

    if (!isValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Código inválido ou expirado.');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }
}
