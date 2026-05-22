import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../config/database/prisma.service';

@Injectable()
export class ServicesService {
  readonly serviceSelect = {
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

  async ensureServiceExists(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: { id: true, salonId: true },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return service;
  }

  async ensureCanManageSalon(
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
