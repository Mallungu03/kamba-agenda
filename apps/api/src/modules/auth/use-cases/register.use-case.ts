import { PrismaService } from '@/config/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import { RegisterDto } from '../dto/register.dto';
import { ConflictException } from '@nestjs/common';
import { AuthService } from '../auth.service';

export class RegisterUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authService: AuthService,
  ) {}

  async execute(createAuthDto: RegisterDto) {
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

    const name = String(createAuthDto.name);
    const passwordHash = await argon2.hash(String(createAuthDto.password));
    const username = await this.authService.resolveUniqueUsername(name);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phone,
        username,
      },
    });

    const { passwordHash: _passwordHash, ...user } = newUser;
    this.eventEmitter.emit('user.registered', { user });

    return await this.authService.generateTokens({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
  }
}
