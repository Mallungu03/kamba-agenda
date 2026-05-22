import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../config/database/prisma.service';

@Injectable()
export class ProfessionalsService {
  readonly professionalSelect = {
    id: true,
    userId: true,
    salonId: true,
    bio: true,
    rating: true,
    totalReviews: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private readonly prisma: PrismaService) {}

  async ensureProfessionalExists(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      select: { id: true, userId: true, salonId: true },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado.');
    }

    return professional;
  }

  async ensureTimeOffBelongsToProfessional(id: string, professionalId: string) {
    const timeOff = await this.prisma.timeOff.findFirst({
      where: { id, professionalId },
      select: { id: true },
    });

    if (!timeOff) {
      throw new NotFoundException('Folga não encontrada.');
    }
  }

  async ensureSlotBelongsToProfessional(id: string, professionalId: string) {
    const slot = await this.prisma.timeSlot.findFirst({
      where: { id, professionalId },
      select: { id: true },
    });

    if (!slot) {
      throw new NotFoundException('Slot não encontrado.');
    }
  }

  async ensureCanManageProfessional(
    professional: { userId: string; salonId: string },
    userId: string,
    requesterRole: string,
  ) {
    if (
      requesterRole === UserRole.SUPER_ADMIN ||
      professional.userId === userId
    ) {
      return;
    }

    await this.ensureCanManageSalon(
      professional.salonId,
      userId,
      requesterRole,
    );
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
