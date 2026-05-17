import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSalonMemberDto } from './dto/create-salon-member.dto';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonMemberDto } from './dto/update-salon-member.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { UpsertSalonScheduleDto } from './dto/upsert-salon-schedule.dto';

@Injectable()
export class SalonsService {
  private readonly salonSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    phone: true,
    email: true,
    address: true,
    city: true,
    state: true,
    zipCode: true,
    logoUrl: true,
    coverUrl: true,
    timezone: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async create(createSalonDto: CreateSalonDto, ownerId: string) {
    const slug = await this.resolveUniqueSlug(
      createSalonDto.slug ?? createSalonDto.name,
    );

    return this.prisma.salon.create({
      data: {
        name: String(createSalonDto.name),
        slug,
        description: String(createSalonDto.description),
        phone: String(createSalonDto.phone),
        email: String(createSalonDto.email)?.toLowerCase(),
        address: String(createSalonDto.address),
        city: String(createSalonDto.city),
        state: String(createSalonDto.state),
        zipCode: String(createSalonDto.zipCode),
        logoUrl: String(createSalonDto.logoUrl),
        coverUrl: String(createSalonDto.coverUrl),
        timezone: String(createSalonDto.timezone),
        members: {
          create: {
            userId: ownerId,
            role: UserRole.SALON_ADMIN,
          },
        },
      },
      select: {
        ...this.salonSelect,
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(query: { city?: string; search?: string; isActive?: boolean }) {
    return this.prisma.salon.findMany({
      where: {
        isActive: query.isActive ?? true,
        city: query.city ? { contains: query.city } : undefined,
        OR: query.search
          ? [
              { name: { contains: query.search } },
              { description: { contains: query.search } },
              { address: { contains: query.search } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...this.salonSelect,
        _count: {
          select: {
            services: true,
            professionals: true,
          },
        },
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.salon.findMany({
      where: {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...this.salonSelect,
        members: {
          where: { userId, isActive: true },
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            appointments: true,
            services: true,
            professionals: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id },
      select: {
        ...this.salonSelect,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            durationMins: true,
            price: true,
          },
        },
        professionals: {
          where: { isActive: true },
          select: {
            id: true,
            bio: true,
            rating: true,
            totalReviews: true,
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!salon) {
      throw new NotFoundException('Salão não encontrado.');
    }

    return salon;
  }

  async findBySlug(slug: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { slug },
      select: this.salonSelect,
    });

    if (!salon) {
      throw new NotFoundException('Salão não encontrado.');
    }

    return salon;
  }

  async update(
    id: string,
    updateSalonDto: UpdateSalonDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(id, requesterId, requesterRole);

    if (updateSalonDto.slug) {
      await this.ensureSlugIsAvailable(updateSalonDto.slug, id);
    }

    return this.prisma.salon.update({
      where: { id },
      data: {
        name: String(updateSalonDto.name),
        slug: updateSalonDto.slug
          ? this.normalizeSlug(updateSalonDto.slug)
          : undefined,
        description: String(updateSalonDto.description),
        phone: String(updateSalonDto.phone),
        email: String(updateSalonDto.email)?.toLowerCase(),
        address: String(updateSalonDto.address),
        city: String(updateSalonDto.city),
        state: String(updateSalonDto.state),
        zipCode: String(updateSalonDto.zipCode),
        logoUrl: String(updateSalonDto.logoUrl),
        coverUrl: String(updateSalonDto.coverUrl),
        timezone: String(updateSalonDto.timezone),
      },
      select: this.salonSelect,
    });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    await this.ensureCanManageSalon(id, requesterId, requesterRole);

    return this.prisma.salon.update({
      where: { id },
      data: { isActive: false },
      select: this.salonSelect,
    });
  }

  async findMembers(
    salonId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);

    return this.prisma.salonMember.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  async addMember(
    salonId: string,
    dto: CreateSalonMemberDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.prisma.salonMember.upsert({
      where: { salonId_userId: { salonId, userId: dto.userId } },
      create: {
        salonId,
        userId: dto.userId,
        role: dto.role ?? UserRole.SALON_ADMIN,
        isActive: dto.isActive,
      },
      update: {
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async updateMember(
    salonId: string,
    memberId: string,
    dto: UpdateSalonMemberDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);
    await this.ensureMemberBelongsToSalon(memberId, salonId);

    return this.prisma.salonMember.update({
      where: { id: memberId },
      data: {
        role: dto.role,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async removeMember(
    salonId: string,
    memberId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);
    await this.ensureMemberBelongsToSalon(memberId, salonId);

    return this.prisma.salonMember.update({
      where: { id: memberId },
      data: { isActive: false },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });
  }

  async findSchedules(salonId: string) {
    await this.ensureSalonExists(salonId);

    return this.prisma.salonSchedule.findMany({
      where: { salonId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertSchedule(
    salonId: string,
    dto: UpsertSalonScheduleDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);

    return this.prisma.salonSchedule.upsert({
      where: { salonId_dayOfWeek: { salonId, dayOfWeek: dto.dayOfWeek } },
      create: {
        salonId,
        dayOfWeek: dto.dayOfWeek,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        isClosed: dto.isClosed,
      },
      update: {
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        isClosed: dto.isClosed,
      },
    });
  }

  async removeSchedule(
    salonId: string,
    scheduleId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);

    const schedule = await this.prisma.salonSchedule.findFirst({
      where: { id: scheduleId, salonId },
      select: { id: true },
    });

    if (!schedule) {
      throw new NotFoundException('Horário do salão não encontrado.');
    }

    await this.prisma.salonSchedule.delete({ where: { id: scheduleId } });

    return { deleted: true };
  }

  private async ensureSalonExists(id: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!salon) {
      throw new NotFoundException('Salão não encontrado.');
    }
  }

  private async ensureMemberBelongsToSalon(memberId: string, salonId: string) {
    const member = await this.prisma.salonMember.findFirst({
      where: { id: memberId, salonId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Membro do salão não encontrado.');
    }
  }

  private async ensureCanManageSalon(
    salonId: string,
    userId: string,
    requesterRole: string,
  ) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true },
    });

    if (!salon) {
      throw new NotFoundException('Salão não encontrado.');
    }

    if (requesterRole === UserRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.salonMember.findFirst({
      where: {
        salonId,
        userId,
        isActive: true,
        role: UserRole.SALON_ADMIN,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Você não tem permissão para este salão.');
    }
  }

  private async ensureSlugIsAvailable(slug: string, currentSalonId: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const existingSalon = await this.prisma.salon.findFirst({
      where: {
        slug: normalizedSlug,
        id: { not: currentSalonId },
      },
      select: { id: true },
    });

    if (existingSalon) {
      throw new ConflictException('Slug já está em uso.');
    }
  }

  private async resolveUniqueSlug(value: string): Promise<string> {
    const baseSlug = this.normalizeSlug(value);
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.salon.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private normalizeSlug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
