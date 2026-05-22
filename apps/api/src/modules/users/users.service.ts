import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../config/database/prisma.service';

@Injectable()
export class UsersService {
  readonly userSelect = {
    id: true,
    email: true,
    phone: true,
    name: true,
    username: true,
    avatarUrl: true,
    role: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
  }

  async ensureUniqueContacts(
    currentUserId: string,
    email?: string,
    phone?: string,
  ) {
    if (!email && !phone) {
      return;
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: { not: currentUserId },
        OR: [
          ...(email ? [{ email: email.toLowerCase() }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email ou telefone já está em uso.');
    }
  }

  ensureSelfOrSuperAdmin(
    userId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    if (requesterRole === UserRole.SUPER_ADMIN || userId === requesterId) {
      return;
    }

    throw new ForbiddenException('Você não tem permissão para este usuário.');
  }

  ensureSuperAdmin(role: string) {
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Apenas super administradores podem executar esta ação.',
      );
    }
  }
}
