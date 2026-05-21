import { PrismaService } from '@/config/database/prisma.service';
import { SignInDto } from '../dto/signin.dto';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from '../auth.service';

export class SignInUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}
  async execute(loginAuthDto: SignInDto) {
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

    return await this.authService.generateTokens({
      email: updatedUser.email,
      id: updatedUser.id,
      role: updatedUser.role,
    });
  }
}
