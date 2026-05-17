import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdateTimeOffDto } from './dto/update-time-off.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';

@Injectable()
export class ProfessionalsService {
  private readonly professionalSelect = {
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

  async create(
    salonId: string,
    dto: CreateProfessionalDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);

    const existingUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const existingProfile = await this.prisma.professional.findUnique({
      where: { userId: dto.userId },
      select: { id: true },
    });

    if (existingProfile) {
      throw new ConflictException('Usuário já possui perfil profissional.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: dto.userId },
        data: { role: UserRole.PROFESSIONAL },
      });

      return tx.professional.create({
        data: {
          salonId,
          userId: dto.userId,
          bio: dto.bio,
          isActive: dto.isActive,
        },
        select: {
          ...this.professionalSelect,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          salon: { select: { id: true, name: true, slug: true } },
        },
      });
    });
  }

  async findAll(query: {
    salonId?: string;
    serviceId?: string;
    search?: string;
    isActive?: boolean;
  }) {
    return this.prisma.professional.findMany({
      where: {
        salonId: query.salonId,
        isActive: query.isActive ?? true,
        services: query.serviceId
          ? { some: { serviceId: query.serviceId } }
          : undefined,
        user: query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { email: { contains: query.search } },
              ],
            }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...this.professionalSelect,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        salon: { select: { id: true, name: true, slug: true, city: true } },
        services: {
          select: {
            id: true,
            customPrice: true,
            customDuration: true,
            service: {
              select: {
                id: true,
                name: true,
                durationMins: true,
                price: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      select: {
        ...this.professionalSelect,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        salon: { select: { id: true, name: true, slug: true } },
        services: {
          select: {
            id: true,
            customPrice: true,
            customDuration: true,
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                durationMins: true,
                price: true,
              },
            },
          },
        },
        availabilities: { orderBy: { dayOfWeek: 'asc' } },
        timeOff: { orderBy: { startDate: 'asc' } },
        _count: {
          select: {
            appointments: true,
            reviews: true,
            waitlistEntries: true,
          },
        },
      },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado.');
    }

    return professional;
  }

  async update(
    id: string,
    dto: UpdateProfessionalDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    return this.prisma.professional.update({
      where: { id },
      data: {
        bio: dto.bio,
        isActive: dto.isActive,
      },
      select: {
        ...this.professionalSelect,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageSalon(
      professional.salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.professional.update({
      where: { id },
      data: { isActive: false },
      select: this.professionalSelect,
    });
  }

  async findAppointments(
    id: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    return this.prisma.appointment.findMany({
      where: { professionalId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        salon: { select: { id: true, name: true } },
        service: {
          select: { id: true, name: true, durationMins: true, price: true },
        },
        slot: {
          select: { id: true, startTime: true, endTime: true, status: true },
        },
      },
    });
  }

  async findReviews(id: string) {
    await this.ensureProfessionalExists(id);

    return this.prisma.review.findMany({
      where: { professionalId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        response: true,
        respondedAt: true,
        createdAt: true,
        customer: { select: { id: true, name: true, avatarUrl: true } },
        appointment: {
          select: { id: true, service: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async respondReview(
    id: string,
    reviewId: string,
    dto: RespondReviewDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, professionalId: id },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { response: dto.response, respondedAt: new Date() },
    });
  }

  async findAvailabilities(id: string) {
    await this.ensureProfessionalExists(id);

    return this.prisma.availability.findMany({
      where: { professionalId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertAvailability(
    id: string,
    dto: UpsertAvailabilityDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    return this.prisma.availability.upsert({
      where: {
        professionalId_dayOfWeek: {
          professionalId: id,
          dayOfWeek: dto.dayOfWeek,
        },
      },
      create: {
        professionalId: id,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isOff: dto.isOff,
        appointmentGap: dto.appointmentGap,
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        isOff: dto.isOff,
        appointmentGap: dto.appointmentGap,
      },
    });
  }

  async removeAvailability(
    id: string,
    availabilityId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    const availability = await this.prisma.availability.findFirst({
      where: { id: availabilityId, professionalId: id },
      select: { id: true },
    });

    if (!availability) {
      throw new NotFoundException('Disponibilidade não encontrada.');
    }

    await this.prisma.availability.delete({ where: { id: availabilityId } });

    return { deleted: true };
  }

  async findTimeOffs(id: string) {
    await this.ensureProfessionalExists(id);

    return this.prisma.timeOff.findMany({
      where: { professionalId: id },
      orderBy: { startDate: 'asc' },
    });
  }

  async createTimeOff(
    id: string,
    dto: CreateTimeOffDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    return this.prisma.timeOff.create({
      data: {
        professionalId: id,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
        isAllDay: dto.isAllDay,
      },
    });
  }

  async updateTimeOff(
    id: string,
    timeOffId: string,
    dto: UpdateTimeOffDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.ensureTimeOffBelongsToProfessional(timeOffId, id);

    return this.prisma.timeOff.update({
      where: { id: timeOffId },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        reason: dto.reason,
        isAllDay: dto.isAllDay,
      },
    });
  }

  async removeTimeOff(
    id: string,
    timeOffId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.ensureTimeOffBelongsToProfessional(timeOffId, id);

    await this.prisma.timeOff.delete({ where: { id: timeOffId } });

    return { deleted: true };
  }

  async findSlots(id: string) {
    await this.ensureProfessionalExists(id);

    return this.prisma.timeSlot.findMany({
      where: { professionalId: id },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        lockedUntil: true,
        lockedBy: true,
        version: true,
        appointment: { select: { id: true, status: true, customerId: true } },
      },
    });
  }

  async createSlot(
    id: string,
    dto: CreateTimeSlotDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    return this.prisma.timeSlot.create({
      data: {
        professionalId: id,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: dto.status,
        lockedUntil: dto.lockedUntil ? new Date(dto.lockedUntil) : undefined,
        lockedBy: dto.lockedBy,
      },
    });
  }

  async updateSlot(
    id: string,
    slotId: string,
    dto: UpdateTimeSlotDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.ensureSlotBelongsToProfessional(slotId, id);

    return this.prisma.timeSlot.update({
      where: { id: slotId },
      data: {
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        status: dto.status,
        lockedUntil: dto.lockedUntil ? new Date(dto.lockedUntil) : undefined,
        lockedBy: dto.lockedBy,
        version: { increment: 1 },
      },
    });
  }

  async removeSlot(
    id: string,
    slotId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(id);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.ensureSlotBelongsToProfessional(slotId, id);

    await this.prisma.timeSlot.delete({ where: { id: slotId } });

    return { deleted: true };
  }

  private async ensureProfessionalExists(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      select: { id: true, userId: true, salonId: true },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado.');
    }

    return professional;
  }

  private async ensureTimeOffBelongsToProfessional(
    id: string,
    professionalId: string,
  ) {
    const timeOff = await this.prisma.timeOff.findFirst({
      where: { id, professionalId },
      select: { id: true },
    });

    if (!timeOff) {
      throw new NotFoundException('Folga não encontrada.');
    }
  }

  private async ensureSlotBelongsToProfessional(
    id: string,
    professionalId: string,
  ) {
    const slot = await this.prisma.timeSlot.findFirst({
      where: { id, professionalId },
      select: { id: true },
    });

    if (!slot) {
      throw new NotFoundException('Slot não encontrado.');
    }
  }

  private async ensureCanManageProfessional(
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
