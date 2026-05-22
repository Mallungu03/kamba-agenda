import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel } from '../../../generated/prisma/client';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('auth.password-reset.requested')
  async onPasswordResetRequested(payload: any) {
    await this.notificationsService.createAndQueue({
      userId: payload.user.id,
      channel: NotificationChannel.EMAIL,
      subject: 'Código para redefinir senha',
      content: `Seu código de reset é ${payload.code}. Ele expira em 10 minutos.`,
    });
  }

  @OnEvent('auth.email-verification.requested')
  async onEmailVerificationRequested(payload: any) {
    await this.notificationsService.createAndQueue({
      userId: payload.user.id,
      channel: NotificationChannel.EMAIL,
      subject: 'Código de verificação de email',
      content: `Seu código de verificação é ${payload.code}. Ele expira em 10 minutos.`,
    });
  }

  @OnEvent('appointment.created')
  async onAppointmentCreated(payload: any) {
    const appointment = payload.appointment;
    await this.notificationsService.createAndQueue({
      userId: appointment.customerId,
      channel: NotificationChannel.EMAIL,
      subject: 'Agendamento recebido',
      content: `Recebemos seu agendamento para ${appointment.service.name}.`,
    });
  }

  @OnEvent('appointment.cancelled')
  async onAppointmentCancelled(payload: any) {
    const appointment = payload.appointment;
    await this.notificationsService.createAndQueue({
      userId: appointment.customerId,
      channel: NotificationChannel.EMAIL,
      subject: 'Agendamento cancelado',
      content: `Seu agendamento para ${appointment.service.name} foi cancelado.`,
    });
  }

  @OnEvent('waitlist.notified')
  async onWaitlistNotified(payload: any) {
    const entry = payload.entry;
    await this.notificationsService.createAndQueue({
      userId: entry.customerId,
      channel: NotificationChannel.EMAIL,
      subject: 'Horário disponível',
      content: `Um horário abriu para ${entry.service.name}.`,
    });
  }
}
