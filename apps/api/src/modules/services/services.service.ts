import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AssignProfessionalServiceDto } from './dto/assign-professional-service.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  private readonly serviceSelect = {
    id: true,
    salonId: true,
    name: true,
    description: true,
    durationMins: true,
    price: true,
    bufferBefore: true,
    bufferAfter: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async create(
    salonId: string,
    dto: CreateServiceDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);

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
      select: this.serviceSelect,
    });
  }

  async findAll(query: {
    salonId?: string;
    search?: string;
    isActive?: boolean;
  }) {
    return this.prisma.service.findMany({
      where: {
        salonId: query.salonId,
        isActive: query.isActive ?? true,
        OR: query.search
          ? [
              { name: { contains: query.search } },
              { description: { contains: query.search } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...this.serviceSelect,
        salon: { select: { id: true, name: true, slug: true, city: true } },
        _count: { select: { professionals: true, appointments: true } },
      },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: {
        ...this.serviceSelect,
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
    const service = await this.ensureServiceExists(id);
    await this.ensureCanManageSalon(
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
      select: this.serviceSelect,
    });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const service = await this.ensureServiceExists(id);
    await this.ensureCanManageSalon(
      service.salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
      select: this.serviceSelect,
    });
  }

  async assignProfessional(
    serviceId: string,
    dto: AssignProfessionalServiceDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const service = await this.ensureServiceExists(serviceId);
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

    await this.ensureCanManageSalon(
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
        service: { select: this.serviceSelect },
      },
    });
  }

  async unassignProfessional(
    serviceId: string,
    professionalId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const service = await this.ensureServiceExists(serviceId);
    await this.ensureCanManageSalon(
      service.salonId,
      requesterId,
      requesterRole,
    );

    await this.prisma.professionalService.delete({
      where: { professionalId_serviceId: { professionalId, serviceId } },
    });

    return { deleted: true };
  }

  private async ensureServiceExists(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: { id: true, salonId: true },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return service;
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
}
