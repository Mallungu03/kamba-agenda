import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { UpdateAuthDto } from './dto/update.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo.');
    }

    const { passwordHash: _passwordHash, ...profile } = user;
    return profile;
  }

  async logout(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    await this.prisma.refreshToken.updateMany({
      where: { expiresAt: { gt: new Date() }, userId },
      data: { expiresAt: new Date() },
    });

    return { message: 'Logout realizado com sucesso.' };
  }

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

  async generateTokens(dto: { id: string; email: string; role: string }) {
    const jti = uuidv4();
    const payload = { id: dto.id, email: dto.email, role: dto.role, jti };

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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken);
    } catch (e) {
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
        userId,
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
        break;
      }
    }

    if (!isTokenValid) {
      throw new UnauthorizedException('Token de atualização inválido.');
    }

    return await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
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

    return { message: 'Senha alterada com sucesso.' };
  }
}
