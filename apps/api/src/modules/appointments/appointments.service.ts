import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AppointmentStatus,
  SlotStatus,
  UserRole,
} from '../../../generated/prisma/client';
import { PrismaService } from '@/config/database/prisma.service';
import { toJson } from '@/shared/json';

@Injectable()
export class AppointmentsService {
  readonly appointmentSelect = {
    id: true,
    customerId: true,
    professionalId: true,
    salonId: true,
    serviceId: true,
    slotId: true,
    status: true,
    notes: true,
    cancellationReason: true,
    cancelledBy: true,
    confirmedAt: true,
    completedAt: true,
    noShowAt: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(
    readonly prisma: PrismaService,
    readonly eventEmitter: EventEmitter2,
  ) {}

  async changeStatus(
    id: string,
    status: AppointmentStatus,
    requesterId: string,
    requesterRole: string,
    extra?: { cancellationReason?: string; notes?: string },
  ) {
    const appointment = await this.ensureAppointmentExists(id);

    if (status === AppointmentStatus.CANCELLED) {
      await this.ensureCanAccessAppointment(
        appointment,
        requesterId,
        requesterRole,
      );
    } else {
      await this.ensureCanManageAppointment(
        appointment,
        requesterId,
        requesterRole,
      );
    }

    this.ensureStatusTransition(appointment.status, status);

    const statusDates = {
      confirmedAt:
        status === AppointmentStatus.CONFIRMED ? new Date() : undefined,
      completedAt:
        status === AppointmentStatus.COMPLETED ? new Date() : undefined,
      noShowAt: status === AppointmentStatus.NO_SHOW ? new Date() : undefined,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.appointment.update({
        where: { id },
        data: {
          status,
          notes: extra?.notes,
          cancellationReason:
            status === AppointmentStatus.CANCELLED
              ? extra?.cancellationReason
              : undefined,
          cancelledBy:
            status === AppointmentStatus.CANCELLED ? requesterId : undefined,
          ...statusDates,
        },
        select: this.getAppointmentDetailsSelect(),
      });

      if (status === AppointmentStatus.CANCELLED) {
        await tx.timeSlot.update({
          where: { id: appointment.slotId },
          data: {
            status: SlotStatus.AVAILABLE,
            lockedUntil: null,
            lockedBy: null,
            version: { increment: 1 },
          },
        });
      }

      if (
        status === AppointmentStatus.COMPLETED ||
        status === AppointmentStatus.NO_SHOW
      ) {
        await tx.timeSlot.update({
          where: { id: appointment.slotId },
          data: { version: { increment: 1 } },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: requesterId,
          action: `APPOINTMENT_${status}`,
          entityType: 'Appointment',
          entityId: id,
          oldValues: appointment,
          newValues: changed,
        },
      });

      return changed;
    });

    return updated;
  }

  ensureStatusTransition(
    currentStatus: AppointmentStatus,
    nextStatus: AppointmentStatus,
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    const finalStatuses: AppointmentStatus[] = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ];

    if (finalStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        'Não é possível alterar um agendamento finalizado.',
      );
    }

    if (
      nextStatus === AppointmentStatus.COMPLETED &&
      currentStatus !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Agendamento precisa estar confirmado para ser concluído.',
      );
    }
  }

  async ensureAppointmentExists(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: {
        ...this.appointmentSelect,
        professional: { select: { userId: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    return appointment;
  }

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

  async ensureCanAccessAppointment(
    appointment: {
      customerId: string;
      salonId: string;
      professional: { userId: string };
    },
    userId: string,
    requesterRole: string,
  ) {
    if (
      requesterRole === UserRole.SUPER_ADMIN ||
      appointment.customerId === userId ||
      appointment.professional.userId === userId
    ) {
      return;
    }

    await this.ensureCanManageSalon(appointment.salonId, userId, requesterRole);
  }

  async ensureCanManageAppointment(
    appointment: { salonId: string; professional: { userId: string } },
    userId: string,
    requesterRole: string,
  ) {
    if (
      requesterRole === UserRole.SUPER_ADMIN ||
      appointment.professional.userId === userId
    ) {
      return;
    }

    await this.ensureCanManageSalon(appointment.salonId, userId, requesterRole);
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

  async buildRequesterScope(userId: string, requesterRole: string) {
    if (requesterRole === UserRole.SUPER_ADMIN) {
      return {};
    }

    const managedSalons = await this.prisma.salonMember.findMany({
      where: {
        userId,
        isActive: true,
        role: UserRole.SALON_ADMIN,
      },
      select: { salonId: true },
    });

    const professional = await this.prisma.professional.findUnique({
      where: { userId },
      select: { id: true },
    });

    return {
      OR: [
        { customerId: userId },
        ...(professional ? [{ professionalId: professional.id }] : []),
        ...managedSalons.map((member) => ({ salonId: member.salonId })),
      ],
    };
  }

  async recalculateProfessionalRating(professionalId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { professionalId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.professional.update({
      where: { id: professionalId },
      data: {
        rating: aggregate._avg.rating ?? 0,
        totalReviews: aggregate._count.id,
      },
    });
  }

  async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: unknown,
    newValues: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValues: toJson(oldValues),
        newValues: toJson(newValues),
      },
    });
  }

  getAppointmentDetailsSelect() {
    return {
      ...this.appointmentSelect,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
        },
      },
      professional: {
        select: {
          id: true,
          bio: true,
          rating: true,
          totalReviews: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      },
      salon: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          address: true,
          city: true,
          timezone: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          description: true,
          durationMins: true,
          price: true,
          bufferBefore: true,
          bufferAfter: true,
        },
      },
      slot: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          version: true,
        },
      },
      notifications: {
        select: {
          id: true,
          channel: true,
          status: true,
          to: true,
          subject: true,
          retryCount: true,
          sentAt: true,
          errorMessage: true,
          createdAt: true,
        },
      },
      review: {
        select: {
          id: true,
          rating: true,
          comment: true,
          response: true,
          respondedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    };
  }
}
