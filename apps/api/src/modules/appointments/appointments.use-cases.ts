import {
  BadRequestException,
  ConflictException,
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
import { PrismaService } from '../../config/database/prisma.service';
import {
  AppointmentCancelledEventPayload,
  AppointmentCreatedEventPayload,
} from '@/shared/interfaces/event-payloads';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

import { AppointmentsService } from './appointments.service';

@Injectable()
export class AppointmentsUseCases {
  constructor(
    private readonly appointmentsService: AppointmentsService,

    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateAppointmentDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const customerId = String(dto.customerId ?? requesterId);

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
        where: { id: String(dto.professionalId) },
        select: { id: true, salonId: true, isActive: true },
      }),
      this.prisma.service.findUnique({
        where: { id: String(dto.serviceId) },
        select: { id: true, salonId: true, isActive: true },
      }),
      this.prisma.timeSlot.findUnique({
        where: { id: String(dto.slotId) },
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
          notes: String(dto.notes),
        },
        select: this.appointmentsService.getAppointmentDetailsSelect(),
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
          newValues: created,
        },
      });

      return created;
    });

    const appointmentCreatedPayload: AppointmentCreatedEventPayload = {
      appointment,
    };
    this.eventEmitter.emit('appointment.created', appointmentCreatedPayload);
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
    const scopedWhere = await this.appointmentsService.buildRequesterScope(
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
      select: this.appointmentsService.getAppointmentDetailsSelect(),
    });
  }

  async findMine(requesterId: string) {
    return this.prisma.appointment.findMany({
      where: { customerId: requesterId },
      orderBy: { createdAt: 'desc' },
      select: this.appointmentsService.getAppointmentDetailsSelect(),
    });
  }

  async findBySalon(
    salonId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    await this.appointmentsService.ensureCanManageSalon(
      salonId,
      requesterId,
      requesterRole,
    );

    return this.prisma.appointment.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' },
      select: this.appointmentsService.getAppointmentDetailsSelect(),
    });
  }

  async findByProfessional(
    professionalId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const professional =
      await this.appointmentsService.ensureProfessionalExists(professionalId);
    await this.appointmentsService.ensureCanManageProfessional(
      professional,
      requesterId,
      requesterRole,
    );

    return this.prisma.appointment.findMany({
      where: { professionalId },
      orderBy: { createdAt: 'desc' },
      select: this.appointmentsService.getAppointmentDetailsSelect(),
    });
  }

  async findOne(id: string, requesterId: string, requesterRole: string) {
    const appointment =
      await this.appointmentsService.ensureAppointmentExists(id);
    await this.appointmentsService.ensureCanAccessAppointment(
      appointment,
      requesterId,
      requesterRole,
    );

    return this.prisma.appointment.findUnique({
      where: { id },
      select: this.appointmentsService.getAppointmentDetailsSelect(),
    });
  }

  async update(
    id: string,
    dto: UpdateAppointmentDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const appointment =
      await this.appointmentsService.ensureAppointmentExists(id);

    if (dto.status && dto.status !== appointment.status) {
      return this.appointmentsService.changeStatus(
        id,
        dto.status,
        requesterId,
        requesterRole,
        {
          cancellationReason: dto.cancellationReason,
          notes: dto.notes,
        },
      );
    }

    await this.appointmentsService.ensureCanAccessAppointment(
      appointment,
      requesterId,
      requesterRole,
    );

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { notes: dto.notes },
      select: this.appointmentsService.getAppointmentDetailsSelect(),
    });

    await this.appointmentsService.createAuditLog(
      requesterId,
      'APPOINTMENT_UPDATED',
      'Appointment',
      id,
      appointment,
      updated,
    );

    if (status === AppointmentStatus.CANCELLED) {
      const cancelledPayload: AppointmentCancelledEventPayload = {
        appointment: updated,
      };
      this.eventEmitter.emit('appointment.cancelled', cancelledPayload);
    }

    return updated;
  }

  async confirm(id: string, requesterId: string, requesterRole: string) {
    return this.appointmentsService.changeStatus(
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
    return this.appointmentsService.changeStatus(
      id,
      AppointmentStatus.CANCELLED,
      requesterId,
      requesterRole,
      { cancellationReason: dto.cancellationReason },
    );
  }

  async complete(id: string, requesterId: string, requesterRole: string) {
    return this.appointmentsService.changeStatus(
      id,
      AppointmentStatus.COMPLETED,
      requesterId,
      requesterRole,
    );
  }

  async markNoShow(id: string, requesterId: string, requesterRole: string) {
    return this.appointmentsService.changeStatus(
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
    const appointment =
      await this.appointmentsService.ensureAppointmentExists(id);
    await this.appointmentsService.ensureCanAccessAppointment(
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
    const appointment =
      await this.appointmentsService.ensureAppointmentExists(id);

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
        professionalId: String(appointment.professionalId),
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.appointmentsService.recalculateProfessionalRating(
      appointment.professionalId,
    );
    await this.appointmentsService.createAuditLog(
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
    const appointment =
      await this.appointmentsService.ensureAppointmentExists(id);

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

    await this.appointmentsService.recalculateProfessionalRating(
      review.professionalId,
    );
    await this.appointmentsService.createAuditLog(
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
    const appointment =
      await this.appointmentsService.ensureAppointmentExists(id);

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
    await this.appointmentsService.recalculateProfessionalRating(
      review.professionalId,
    );
    await this.appointmentsService.createAuditLog(
      requesterId,
      'REVIEW_DELETED',
      'Review',
      review.id,
      review,
      null,
    );

    return { deleted: true };
  }
}
