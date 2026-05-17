import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import * as argon2 from 'argon2';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly jwt: JwtService,
  ) {}

  async register(createAuthDto: RegisterAuthDto) {
    const email = String(createAuthDto.email).toLowerCase();
    const phone = createAuthDto.phone ? String(createAuthDto.phone) : undefined;
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email ou telefone já está em uso.');
    }

    const passwordHash = await argon2.hash(String(createAuthDto.password));
    const username = this.generateUsername(String(createAuthDto.name));

    const newUser = await this.prisma.user.create({
      data: {
        email,
        name: String(createAuthDto.name),
        passwordHash,
        phone,
        username,
      },
    });

    const { passwordHash: _passwordHash, ...user } = newUser;
    this.eventEmitter.emit('user.registered', { user });

    return await this.generateTokens({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
  }

  async login(loginAuthDto: LoginAuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: String(loginAuthDto.email) },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      String(loginAuthDto.password),
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return await this.generateTokens({
      email: updatedUser.email,
      id: updatedUser.id,
      role: updatedUser.role,
    });
  }

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

  private generateUsername(name: string): string {
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const randomSuffix = Math.random().toString(36).substring(2, 8);

    return `@${baseUsername}-${randomSuffix}`;
  }

  private async generateTokens(dto: {
    id: string;
    email: string;
    role: string;
  }) {
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

  async refreshTokens(userId: string, refreshToken: string) {
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
