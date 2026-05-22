import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdateTimeOffDto } from './dto/update-time-off.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';
import { ProfessionalsService } from './professionals.service';
import { getPagination, paginated } from '@/shared/pagination';
import { PrismaService } from '@/config/database/prisma.service';
import { UserRole } from '@generated/prisma/enums';

@Injectable()
export class ProfessionalsUseCases {
  constructor(
    private readonly professionalsService: ProfessionalsService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    salonId: string,
    dto: CreateProfessionalDto,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.professionalsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

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
          ...this.professionalsService.professionalSelect,
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
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip, take } = getPagination(query);
    const where = {
      salonId: query.salonId,
      isActive: query.isActive ?? true,
      services: query.serviceId
        ? { some: { serviceId: query.serviceId } }
        : undefined,
      user: query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
            ],
          }
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.professional.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          ...this.professionalsService.professionalSelect,
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
      }),
      this.prisma.professional.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      select: {
        ...this.professionalsService.professionalSelect,
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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
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
        ...this.professionalsService.professionalSelect,
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageSalon(
      professional.salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.professional.update({
      where: { id },
      data: { isActive: false },
      select: this.professionalsService.professionalSelect,
    });
  }

  async findAppointments(
    id: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
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
    await this.professionalsService.ensureProfessionalExists(id);

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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
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
    await this.professionalsService.ensureProfessionalExists(id);

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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
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
    await this.professionalsService.ensureProfessionalExists(id);

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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.professionalsService.ensureTimeOffBelongsToProfessional(
      timeOffId,
      id,
    );

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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.professionalsService.ensureTimeOffBelongsToProfessional(
      timeOffId,
      id,
    );

    await this.prisma.timeOff.delete({ where: { id: timeOffId } });

    return { deleted: true };
  }

  async findSlots(id: string) {
    await this.professionalsService.ensureProfessionalExists(id);

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

  async findAvailableSlots(id: string, date?: string, serviceId?: string) {
    await this.professionalsService.ensureProfessionalExists(id);

    const dayStart = date ? new Date(`${date}T00:00:00.000Z`) : new Date(0);
    const dayEnd = date
      ? new Date(
          new Date(`${date}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000,
        )
      : new Date('9999-12-31');

    const slots = await this.prisma.timeSlot.findMany({
      where: {
        professionalId: id,
        status: 'AVAILABLE',
        startTime: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        version: true,
      },
    });

    if (!serviceId) return slots;

    // fetch service duration and professional custom duration if any
    const profService = await this.prisma.professionalService.findFirst({
      where: { professionalId: id, serviceId },
      select: { customDuration: true },
    });

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { durationMins: true },
    });

    const requiredMins =
      profService?.customDuration ?? service?.durationMins ?? 0;

    return slots.filter((s) => {
      const dur = (s.endTime.getTime() - s.startTime.getTime()) / 60000;
      return dur >= requiredMins;
    });
  }

  async createSlot(
    id: string,
    dto: CreateTimeSlotDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.professionalsService.ensureSlotBelongsToProfessional(slotId, id);

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
    const professional =
      await this.professionalsService.ensureProfessionalExists(id);
    await this.professionalsService.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );
    await this.professionalsService.ensureSlotBelongsToProfessional(slotId, id);

    await this.prisma.timeSlot.delete({ where: { id: slotId } });

    return { deleted: true };
  }
}
