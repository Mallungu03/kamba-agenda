import { PrismaService } from '@/config/database/prisma.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { WaitlistService } from './waitlist.service';
import type {
  AppointmentCancelledEventPayload,
  WaitlistNotifiedEventPayload,
} from '@/shared/interfaces/event-payloads';

export class WaitlistListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly waitlistService: WaitlistService,
  ) {}

  @OnEvent('appointment.cancelled')
  async onAppointmentCancelled(payload: AppointmentCancelledEventPayload) {
    const appointment = payload.appointment;
    const entry = await this.prisma.waitlist.findFirst({
      where: {
        professionalId: appointment.professionalId,
        serviceId: appointment.serviceId,
        status: 'WAITING',
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ preferredDate: 'asc' }, { createdAt: 'asc' }],
      select: this.waitlistService.getSelect(),
    });

    if (!entry) {
      return;
    }

    const updated = await this.prisma.waitlist.update({
      where: { id: entry.id },
      data: { status: 'NOTIFIED', notifiedAt: new Date() },
      select: this.waitlistService.getSelect(),
    });

    const waitlistPayload: WaitlistNotifiedEventPayload = {
      entry: updated,
      appointment,
    };
    this.eventEmitter.emit('waitlist.notified', waitlistPayload);
  }
}
