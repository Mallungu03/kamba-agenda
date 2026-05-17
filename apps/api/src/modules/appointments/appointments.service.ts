import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  SlotStatus,
  UserRole,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../config/database/prisma.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class AppointmentsService {
  private readonly appointmentSelect = {
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

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateAppointmentDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const customerId = dto.customerId ?? requesterId;

    if (customerId !== requesterId && requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Apenas super administradores podem agendar para outro cliente.',
      );
    }

    const [customer, professional, service, slot] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: customerId },
        select: { id: true, isActive: true },
      }),
      this.prisma.professional.findUnique({
        where: { id: dto.professionalId },
        select: { id: true, salonId: true, isActive: true },
      }),
      this.prisma.service.findUnique({
        where: { id: dto.serviceId },
        select: { id: true, salonId: true, isActive: true },
      }),
      this.prisma.timeSlot.findUnique({
        where: { id: dto.slotId },
        select: {
          id: true,
          professionalId: true,
          startTime: true,
          endTime: true,
          status: true,
          lockedUntil: true,
          lockedBy: true,
        },
      }),
    ]);

    if (!customer?.isActive) {
      throw new NotFoundException('Cliente não encontrado ou inativo.');
    }

    if (!professional?.isActive) {
      throw new NotFoundException('Profissional não encontrado ou inativo.');
    }

    if (!service?.isActive) {
      throw new NotFoundException('Serviço não encontrado ou inativo.');
    }

    if (!slot) {
      throw new NotFoundException('Slot não encontrado.');
    }

    if (professional.salonId !== service.salonId) {
      throw new ConflictException(
        'Serviço e profissional precisam pertencer ao mesmo salão.',
      );
    }

    if (slot.professionalId !== professional.id) {
      throw new ConflictException(
        'Slot não pertence ao profissional informado.',
      );
    }

    if (
      slot.status !== SlotStatus.AVAILABLE &&
      slot.status !== SlotStatus.LOCKED
    ) {
      throw new ConflictException('Slot não está disponível para agendamento.');
    }

    if (
      slot.status === SlotStatus.LOCKED &&
      slot.lockedUntil &&
      slot.lockedUntil > new Date() &&
      slot.lockedBy !== requesterId
    ) {
      throw new ConflictException('Slot está temporariamente bloqueado.');
    }

    const professionalService =
      await this.prisma.professionalService.findUnique({
        where: {
          professionalId_serviceId: {
            professionalId: professional.id,
            serviceId: service.id,
          },
        },
        select: { id: true },
      });

    if (!professionalService) {
      throw new ConflictException(
        'Profissional não está associado ao serviço informado.',
      );
    }

    const appointment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          customerId,
          professionalId: professional.id,
          salonId: professional.salonId,
          serviceId: service.id,
          slotId: slot.id,
          notes: dto.notes,
        },
        select: this.getAppointmentDetailsSelect(),
      });

      await tx.timeSlot.update({
        where: { id: slot.id },
        data: {
          status: SlotStatus.BOOKED,
          lockedUntil: null,
          lockedBy: null,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: requesterId,
          action: 'APPOINTMENT_CREATED',
          entityType: 'Appointment',
          entityId: created.id,
          newValues: this.toJson(created),
        },
      });

      return created;
    });

    return appointment;
  }

  async findAll(
    query: {
      status?: AppointmentStatus;
      customerId?: string;
      professionalId?: string;
      salonId?: string;
      serviceId?: string;
      from?: string;
      to?: string;
    },
    requesterId: string,
    requesterRole: string,
  ) {
    const scopedWhere = await this.buildRequesterScope(
      requesterId,
      requesterRole,
    );

    return this.prisma.appointment.findMany({
      where: {
        ...scopedWhere,
        status: query.status,
        customerId: query.customerId,
        professionalId: query.professionalId,
        salonId: query.salonId,
        serviceId: query.serviceId,
        slot:
          query.from || query.to
            ? {
                startTime: {
                  gte: query.from ? new Date(query.from) : undefined,
                  lte: query.to ? new Date(query.to) : undefined,
                },
              }
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: this.getAppointmentDetailsSelect(),
    });
  }

  async findMine(requesterId: string) {
    return this.prisma.appointment.findMany({
      where: { customerId: requesterId },
      orderBy: { createdAt: 'desc' },
      select: this.getAppointmentDetailsSelect(),
    });
  }

  async findBySalon(
    salonId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.ensureCanManageSalon(salonId, requesterId, requesterRole);

    return this.prisma.appointment.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      select: this.getAppointmentDetailsSelect(),
    });
  }

  async findByProfessional(
    professionalId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional = await this.ensureProfessionalExists(professionalId);
    await this.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    return this.prisma.appointment.findMany({
      where: { professionalId },
      orderBy: { createdAt: 'desc' },
      select: this.getAppointmentDetailsSelect(),
    });
  }

  async findOne(id: string, requesterId: string, requesterRole: string) {
    const appointment = await this.ensureAppointmentExists(id);
    await this.ensureCanAccessAppointment(
      appointment,
      requesterId,
      requesterRole,
    );

    return this.prisma.appointment.findUnique({
      where: { id },
      select: this.getAppointmentDetailsSelect(),
    });
  }

  async update(
    id: string,
    dto: UpdateAppointmentDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const appointment = await this.ensureAppointmentExists(id);

    if (dto.status && dto.status !== appointment.status) {
      return this.changeStatus(id, dto.status, requesterId, requesterRole, {
        cancellationReason: dto.cancellationReason,
        notes: dto.notes,
      });
    }

    await this.ensureCanAccessAppointment(
      appointment,
      requesterId,
      requesterRole,
    );

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { notes: dto.notes },
      select: this.getAppointmentDetailsSelect(),
    });

    await this.createAuditLog(
      requesterId,
      'APPOINTMENT_UPDATED',
      'Appointment',
      id,
      appointment,
      updated,
    );

    return updated;
  }

  async confirm(id: string, requesterId: string, requesterRole: string) {
    return this.changeStatus(
      id,
      AppointmentStatus.CONFIRMED,
      requesterId,
      requesterRole,
    );
  }

  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    requesterId: string,
    requesterRole: string,
  ) {
    return this.changeStatus(
      id,
      AppointmentStatus.CANCELLED,
      requesterId,
      requesterRole,
      { cancellationReason: dto.cancellationReason },
    );
  }

  async complete(id: string, requesterId: string, requesterRole: string) {
    return this.changeStatus(
      id,
      AppointmentStatus.COMPLETED,
      requesterId,
      requesterRole,
    );
  }

  async markNoShow(id: string, requesterId: string, requesterRole: string) {
    return this.changeStatus(
      id,
      AppointmentStatus.NO_SHOW,
      requesterId,
      requesterRole,
    );
  }

  async remove(id: string, requesterId: string, requesterRole: string) {
    return this.cancel(
      id,
      { cancellationReason: 'Agendamento removido.' },
      requesterId,
      requesterRole,
    );
  }

  async findNotifications(
    id: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const appointment = await this.ensureAppointmentExists(id);
    await this.ensureCanAccessAppointment(
      appointment,
      requesterId,
      requesterRole,
    );

    return this.prisma.notification.findMany({
      where: { appointmentId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReview(id: string, dto: CreateReviewDto, requesterId: string) {
    const appointment = await this.ensureAppointmentExists(id);

    if (appointment.customerId !== requesterId) {
      throw new ForbiddenException(
        'Apenas o cliente do agendamento pode avaliar.',
      );
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Só é possível avaliar agendamentos concluídos.',
      );
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { appointmentId: id },
      select: { id: true },
    });

    if (existingReview) {
      throw new ConflictException('Agendamento já possui avaliação.');
    }

    const review = await this.prisma.review.create({
      data: {
        appointmentId: id,
        customerId: requesterId,
        professionalId: appointment.professionalId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.recalculateProfessionalRating(appointment.professionalId);
    await this.createAuditLog(
      requesterId,
      'REVIEW_CREATED',
      'Review',
      review.id,
      null,
      review,
    );

    return review;
  }

  async updateReview(id: string, dto: UpdateReviewDto, requesterId: string) {
    const appointment = await this.ensureAppointmentExists(id);

    if (appointment.customerId !== requesterId) {
      throw new ForbiddenException(
        'Apenas o cliente do agendamento pode alterar a avaliação.',
      );
    }

    const review = await this.prisma.review.findUnique({
      where: { appointmentId: id },
      select: { id: true, professionalId: true },
    });

    if (!review) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    const updated = await this.prisma.review.update({
      where: { appointmentId: id },
      data: {
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.recalculateProfessionalRating(review.professionalId);
    await this.createAuditLog(
      requesterId,
      'REVIEW_UPDATED',
      'Review',
      review.id,
      review,
      updated,
    );

    return updated;
  }

  async removeReview(id: string, requesterId: string) {
    const appointment = await this.ensureAppointmentExists(id);

    if (appointment.customerId !== requesterId) {
      throw new ForbiddenException(
        'Apenas o cliente do agendamento pode remover a avaliação.',
      );
    }

    const review = await this.prisma.review.findUnique({
      where: { appointmentId: id },
      select: { id: true, professionalId: true },
    });

    if (!review) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    await this.prisma.review.delete({ where: { appointmentId: id } });
    await this.recalculateProfessionalRating(review.professionalId);
    await this.createAuditLog(
      requesterId,
      'REVIEW_DELETED',
      'Review',
      review.id,
      review,
      null,
    );

    return { deleted: true };
  }

  private async changeStatus(
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
          oldValues: this.toJson(appointment),
          newValues: this.toJson(changed),
        },
      });

      return changed;
    });

    return updated;
  }

  private ensureStatusTransition(
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

  private async ensureAppointmentExists(id: string) {
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

  private async ensureCanAccessAppointment(
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

  private async ensureCanManageAppointment(
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

  private async buildRequesterScope(userId: string, requesterRole: string) {
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

  private async recalculateProfessionalRating(professionalId: string) {
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

  private async createAuditLog(
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
        oldValues: this.toJson(oldValues),
        newValues: this.toJson(newValues),
      },
    });
  }

  private toJson(value: unknown) {
    if (value === null || value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value));
  }

  private getAppointmentDetailsSelect() {
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
