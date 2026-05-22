import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSalonMemberDto } from './dto/create-salon-member.dto';
import { CreateSalonDto } from './dto/create-salon.dto';
import { UpdateSalonMemberDto } from './dto/update-salon-member.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { UpsertSalonScheduleDto } from './dto/upsert-salon-schedule.dto';
import { SalonsService } from './salons.service';
import { PrismaService } from '@/config/database/prisma.service';
import { UserRole } from '@generated/prisma/enums';
import { getPagination, paginated } from '@/shared/pagination';

@Injectable()
export class SalonsUseCases {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly prisma: PrismaService,
  ) {}
  async create(createSalonDto: CreateSalonDto, ownerId: string) {
    const slug = await this.salonsService.resolveUniqueSlug(
      String(createSalonDto.slug ?? createSalonDto.name),
    );

    const salon = await this.prisma.salon.create({
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
        ...this.salonsService.salonSelect,
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

    await this.prisma.auditLog.create({
      data: {
        userId: ownerId,
        action: 'SALON_CREATED',
        entityType: 'Salon',
        entityId: salon.id,
        newValues: salon,
      },
    });

    return salon;
  }

  async findAll(query: {
    city?: string;
    search?: string;
    isActive?: boolean;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip, take } = getPagination(query);
    const where = {
      isActive: query.isActive ?? true,
      city: query.city
        ? { contains: query.city, mode: 'insensitive' as const }
        : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              description: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              address: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.salon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          ...this.salonsService.salonSelect,
          _count: {
            select: {
              services: true,
              professionals: true,
            },
          },
        },
      }),
      this.prisma.salon.count({ where }),
    ]);

    return paginated(items, total, page, limit);
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
        ...this.salonsService.salonSelect,
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
        ...this.salonsService.salonSelect,
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
      select: this.salonsService.salonSelect,
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
    await this.salonsService.ensureCanManageSalon(
      id,
      requesterId,
      requesterRole,
    );

    if (updateSalonDto.slug) {
      await this.salonsService.ensureSlugIsAvailable(
        String(updateSalonDto.slug),
        id,
      );
    }

    const oldSalon = await this.prisma.salon.findUnique({
      where: { id },
      select: this.salonsService.salonSelect,
    });

    const updated = await this.prisma.salon.update({
      where: { id },
      data: {
        name: String(updateSalonDto.name),
        slug: updateSalonDto.slug
          ? this.salonsService.normalizeSlug(String(updateSalonDto.slug))
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
      select: this.salonsService.salonSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'SALON_UPDATED',
        entityType: 'Salon',
        entityId: id,
        oldValues: { oldSalon },
        newValues: updated,
      },
    });

    return updated;
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    await this.salonsService.ensureCanManageSalon(
      id,
      requesterId,
      requesterRole,
    );

    const updated = await this.prisma.salon.update({
      where: { id },
      data: { isActive: false },
      select: this.salonsService.salonSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'SALON_DEACTIVATED',
        entityType: 'Salon',
        entityId: id,
        newValues: updated,
      },
    });

    return updated;
  }

  async findMembers(
    salonId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

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
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

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
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );
    await this.salonsService.ensureMemberBelongsToSalon(memberId, salonId);

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
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );
    await this.salonsService.ensureMemberBelongsToSalon(memberId, salonId);

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
    await this.salonsService.ensureSalonExists(salonId);

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
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

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
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

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

  // Gallery methods
  async findGallery(salonId: string) {
    await this.salonsService.ensureSalonExists(salonId);

    return this.prisma.salonGallery.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, imageUrl: true, caption: true, createdAt: true },
    });
  }

  async addGalleryImage(
    salonId: string,
    body: { imageUrl: string; caption?: string },
    requesterId: string,
    requesterRole: string,
  ) {
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

    await this.salonsService.ensureSalonExists(salonId);

    const created = await this.prisma.salonGallery.create({
      data: {
        salonId,
        imageUrl: String(body.imageUrl),
        caption: body.caption ? String(body.caption) : null,
      },
      select: { id: true, imageUrl: true, caption: true, createdAt: true },
    });

    return created;
  }

  async removeGalleryImage(
    salonId: string,
    imageId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.salonsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

    const image = await this.prisma.salonGallery.findFirst({
      where: { id: imageId, salonId },
      select: { id: true, imageUrl: true },
    });

    if (!image) {
      throw new NotFoundException(
        'Imagem da galeria não encontrada para este salão.',
      );
    }

    await this.prisma.salonGallery.delete({ where: { id: imageId } });

    return { deleted: true };
  }
}
