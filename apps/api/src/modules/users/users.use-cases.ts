import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '@/config/database/prisma.service';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { getPagination, paginated } from '@/shared/pagination';

@Injectable()
export class UsersUseCases {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    requesterRole: string,
    query: {
      search?: string;
      role?: UserRole;
      isActive?: boolean;
      page?: string;
      limit?: string;
    },
  ) {
    this.usersService.ensureSuperAdmin(requesterRole);
    const { page, limit, skip, take } = getPagination(query);
    const where = {
      role: query.role,
      isActive: query.isActive,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            {
              username: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: this.usersService.userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(id: string, requesterId: string, requesterRole: string) {
    this.usersService.ensureSelfOrSuperAdmin(id, requesterId, requesterRole);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.usersService.userSelect,
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
    this.usersService.ensureSelfOrSuperAdmin(id, requesterId, requesterRole);

    if (
      requesterRole !== UserRole.SUPER_ADMIN &&
      (updateUserDto.role || updateUserDto.isActive !== undefined)
    ) {
      throw new ForbiddenException(
        'Apenas super administradores podem alterar role ou estado do usuário.',
      );
    }

    await this.usersService.ensureUserExists(id);
    await this.usersService.ensureUniqueContacts(
      id,
      updateUserDto.email,
      updateUserDto.phone,
    );

    const oldUser = await this.prisma.user.findUnique({
      where: { id },
      select: this.usersService.userSelect,
    });

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: updateUserDto.email?.toLowerCase(),
        name: updateUserDto.name,
        phone: updateUserDto.phone,
        avatarUrl: updateUserDto.avatarUrl,
        role: updateUserDto.role,
        isActive: updateUserDto.isActive,
      },
      select: this.usersService.userSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: id,
        oldValues: { oldUser },
        newValues: updated,
      },
    });

    return updated;
  }

  async remove(id: string, requesterRole: string) {
    this.usersService.ensureSuperAdmin(requesterRole);
    await this.usersService.ensureUserExists(id);

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.usersService.userSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: id,
        newValues: updated,
      },
    });

    return updated;
  }
}
