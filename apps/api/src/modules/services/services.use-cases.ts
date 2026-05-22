import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignProfessionalServiceDto } from './dto/assign-professional-service.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';
import { PrismaService } from '@/config/database/prisma.service';
import { getPagination, paginated } from '@/shared/pagination';

@Injectable()
export class ServicesUseCases {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    salonId: string,
    dto: CreateServiceDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.servicesService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.service.create({
      data: {
        salonId,
        name: dto.name,
        description: dto.description,
        durationMins: dto.durationMins,
        price: dto.price,
        bufferBefore: dto.bufferBefore,
        bufferAfter: dto.bufferAfter,
        isActive: dto.isActive,
      },
      select: this.servicesService.serviceSelect,
    });
  }

  async findAll(query: {
    salonId?: string;
    search?: string;
    isActive?: boolean;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip, take } = getPagination(query);
    const where = {
      salonId: query.salonId,
      isActive: query.isActive ?? true,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              description: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          ...this.servicesService.serviceSelect,
          salon: { select: { id: true, name: true, slug: true, city: true } },
          _count: { select: { professionals: true, appointments: true } },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: {
        ...this.servicesService.serviceSelect,
        salon: { select: { id: true, name: true, slug: true } },
        professionals: {
          select: {
            id: true,
            customPrice: true,
            customDuration: true,
            professional: {
              select: {
                id: true,
                bio: true,
                rating: true,
                totalReviews: true,
                isActive: true,
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return service;
  }

  async update(
    id: string,
    dto: UpdateServiceDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const service = await this.servicesService.ensureServiceExists(id);
    await this.servicesService.ensureCanManageSalon(
      service.salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        durationMins: dto.durationMins,
        price: dto.price,
        bufferBefore: dto.bufferBefore,
        bufferAfter: dto.bufferAfter,
        isActive: dto.isActive,
      },
      select: this.servicesService.serviceSelect,
    });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const service = await this.servicesService.ensureServiceExists(id);
    await this.servicesService.ensureCanManageSalon(
      service.salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
      select: this.servicesService.serviceSelect,
    });
  }

  async assignProfessional(
    serviceId: string,
    dto: AssignProfessionalServiceDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const service = await this.servicesService.ensureServiceExists(serviceId);
    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
      select: { id: true, salonId: true },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado.');
    }

    if (professional.salonId !== service.salonId) {
      throw new ConflictException(
        'O profissional precisa pertencer ao mesmo salão do serviço.',
      );
    }

    await this.servicesService.ensureCanManageSalon(
      service.salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.professionalService.upsert({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId,
        },
      },
      create: {
        professionalId: dto.professionalId,
        serviceId,
        customPrice: dto.customPrice,
        customDuration: dto.customDuration,
      },
      update: {
        customPrice: dto.customPrice,
        customDuration: dto.customDuration,
      },
      select: {
        id: true,
        customPrice: true,
        customDuration: true,
        professional: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        service: { select: this.servicesService.serviceSelect },
      },
    });
  }

  async unassignProfessional(
    serviceId: string,
    professionalId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const service = await this.servicesService.ensureServiceExists(serviceId);
    await this.servicesService.ensureCanManageSalon(
      service.salonId,
      requesterId,
      requesterRole,
    );

    await this.prisma.professionalService.delete({
      where: { professionalId_serviceId: { professionalId, serviceId } },
    });

    return { deleted: true };
  }
}
