import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import { Request } from 'express';
import { PrismaService } from '../../config/database/prisma.service';
import { DeviceContextDto } from './dto/device-context.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignInDto } from './dto/signin.dto';
import { UpdateAuthDto } from './dto/update.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import {
  EmailVerificationEventPayload,
  PasswordResetEventPayload,
  RegisteredEventPayload,
} from '@/shared/interfaces/event-payloads';

@Injectable()
export class AuthUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authService: AuthService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = String(dto.email).toLowerCase();
    const phone = dto.phone ? String(dto.phone) : undefined;
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email ou telefone já está em uso.');
    }

    const name = String(dto.name);
    const passwordHash = await argon2.hash(String(dto.password));
    const username = await this.authService.resolveUniqueUsername(name);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phone,
        username,
      },
      omit: { passwordHash: true, updatedAt: true },
    });

    const code = await this.authService.createOtpCode(
      email,
      'verify_email',
      user.id,
    );
    const registerPayload: RegisteredEventPayload = {
      userId: user.id,
      email: user.email,
      code,
    };
    this.eventEmitter.emit('user.registered', registerPayload);
    console.log('Usuario registrado com sucesso:', user.id);
  }

  async sigin(dto: SignInDto & DeviceContextDto, request: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email: String(dto.email) },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      String(dto.password),
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.authService.generateTokens({
      email: updatedUser.email,
      id: updatedUser.id,
      role: updatedUser.role,
      ...this.authService.getDeviceContext(dto, request),
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      omit: { passwordHash: true, updatedAt: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo.');
    }

    return user;
  }

  async signout(userId: string, deviceId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        expiresAt: { gt: new Date() },
        userId,
        deviceId: deviceId || undefined,
      },
      data: { expiresAt: new Date(), revokedAt: new Date() },
    });

    return { message: 'Logout realizado com sucesso.' };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const refreshToken = String(dto.refreshToken);
    const deviceId = String(dto.deviceId ?? '');
    let payload: {
      id: string;
      email: string;
      role: string;
      jti: string;
      deviceId: string;
    };
    try {
      payload = await this.jwt.verifyAsync(refreshToken);
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException('Token de atualização inválido.');
    }

    const userId = payload?.id;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        revokedAt: null,
        userId,
        deviceId: deviceId ?? payload?.deviceId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!storedTokens.length) {
      throw new UnauthorizedException('Token de atualização não encontrado.');
    }

    let isTokenValid = false;

    for (const storedToken of storedTokens) {
      if (await argon2.verify(storedToken.token, refreshToken)) {
        isTokenValid = true;
        await this.prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { lastUsedAt: new Date() },
        });
        break;
      }
    }

    if (!isTokenValid) {
      throw new UnauthorizedException('Token de atualização inválido.');
    }

    return await this.authService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      deviceId: deviceId ?? payload?.deviceId,
    });
  }

  async listSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() }, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revokeSession(userId: string, deviceId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date(), expiresAt: new Date() },
    });

    return { revoked: true };
  }

  async alterPassword(updateAuthDto: UpdateAuthDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    if (updateAuthDto.currentPassword) {
      const isCurrentPasswordValid = await argon2.verify(
        user.passwordHash,
        String(updateAuthDto.currentPassword),
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Senha atual inválida.');
      }
    }

    const newPasswordHash = await argon2.hash(
      String(updateAuthDto.newPassword),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.signout(userId);

    return { message: 'Senha alterada com sucesso.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const emailInput = String(dto.email);
    const email = String(emailInput).toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.isActive) {
      const code = await this.authService.createOtpCode(
        email,
        'password reset',
        user.id,
      );
      const passwordResetPayload: PasswordResetEventPayload = {
        userId: user.id,
        email,
        code,
      };
      this.eventEmitter.emit(
        'auth.password-reset.requested',
        passwordResetPayload,
      );
    }

    return { message: 'Se o email existir, enviaremos um código de reset.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const code = String(dto.code);
    const emailInput = String(dto.email);
    const newPassword = String(dto.newPassword);

    const email = String(emailInput).toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.isActive) {
      throw new NotFoundException('Usuário não encontrado ou inativo.');
    }

    await this.authService.consumeOtpCode(email, 'password reset', code);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await argon2.hash(String(newPassword)) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date(), expiresAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          entityType: 'User',
          entityId: user.id,
        },
      }),
    ]);

    return { message: 'Senha redefinida com sucesso.' };
  }

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.isActive) {
      throw new NotFoundException('Usuário não encontrado ou inativo.');
    }

    const code = await this.authService.createOtpCode(user.email, user.id);

    const emailVerificationPayload: EmailVerificationEventPayload = {
      userId: user.id,
      email: user.email,
      code,
    };
    this.eventEmitter.emit(
      'auth.email-verification.requested',
      emailVerificationPayload,
    );

    return { message: 'Código de verificação enviado.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = String(dto.email);
    const code = String(dto.code);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.isActive) {
      throw new NotFoundException('Usuário não encontrado ou inativo.');
    }

    await this.authService.consumeOtpCode(email, 'verify Email', code);

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
}
