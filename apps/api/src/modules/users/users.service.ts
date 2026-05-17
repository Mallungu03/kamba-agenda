import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../config/database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly userSelect = {
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

  async findAll(requesterRole: string) {
    this.ensureSuperAdmin(requesterRole);

    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.userSelect,
    });
  }

  async findOne(id: string, requesterId: string, requesterRole: string) {
    this.ensureSelfOrSuperAdmin(id, requesterId, requesterRole);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userSelect,
        salonMemberships: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            salon: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                isActive: true,
              },
            },
          },
        },
        professionalProfile: {
          select: {
            id: true,
            salonId: true,
            rating: true,
            totalReviews: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requesterId: string,
    requesterRole: string,
  ) {
    this.ensureSelfOrSuperAdmin(id, requesterId, requesterRole);

    if (
      requesterRole !== UserRole.SUPER_ADMIN &&
      (updateUserDto.role || updateUserDto.isActive !== undefined)
    ) {
      throw new ForbiddenException(
        'Apenas super administradores podem alterar role ou estado do usuário.',
      );
    }

    await this.ensureUserExists(id);
    await this.ensureUniqueContacts(
      id,
      updateUserDto.email,
      updateUserDto.phone,
    );

    return this.prisma.user.update({
      where: { id },
      data: {
        email: updateUserDto.email?.toLowerCase(),
        name: updateUserDto.name,
        phone: updateUserDto.phone,
        avatarUrl: updateUserDto.avatarUrl,
        role: updateUserDto.role,
        isActive: updateUserDto.isActive,
      },
      select: this.userSelect,
    });
  }

  async remove(id: string, requesterRole: string) {
    this.ensureSuperAdmin(requesterRole);
    await this.ensureUserExists(id);

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.userSelect,
    });
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
  }

  private async ensureUniqueContacts(
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

  private ensureSelfOrSuperAdmin(
    userId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    if (requesterRole === UserRole.SUPER_ADMIN || userId === requesterId) {
      return;
    }

    throw new ForbiddenException('Você não tem permissão para este usuário.');
  }

  private ensureSuperAdmin(role: string) {
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Apenas super administradores podem executar esta ação.',
      );
    }
  }
}
