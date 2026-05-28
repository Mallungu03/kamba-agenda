import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '@/config/database/prisma.service';
import { Job } from 'bullmq';
import {
  NotificationJob,
  NOTIFICATIONS_QUEUE,
} from '@/shared/constants/all-constants';
import { Notification, NotificationChannel } from '@generated/prisma/client';
import { EmailProvider } from './providers/email.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';

@Injectable()
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvider: EmailProvider,
    private readonly whatsappProvider: WhatsappProvider,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
      include: { user: { select: { email: true, phone: true } } },
    });

    if (!notification || !notification.user) {
      return;
    }

    try {
      if (notification.channel === NotificationChannel.EMAIL) {
        if (!notification.user.email) {
          throw new Error('Usuário não possui email cadastrado.');
        }

        await this.emailProvider.send({
          to: notification.user.email,
          subject: notification.subject || 'Notificação',
          text: notification.content,
        });
      } else if (notification.channel === NotificationChannel.WHATSAPP) {
        if (!notification.user.phone) {
          throw new Error('Usuário não possui telefone cadastrado.');
        }

        await this.whatsappProvider.send({
          to: notification.user.phone,
          text: notification.content,
        });
      } else {
        throw new Error('Canal de notificação inválido.');
      }

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          sentAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          errorMessage:
            error instanceof Error ? error.message : 'Falha desconhecida.',
        },
      });
      throw error;
    }
  }
}
