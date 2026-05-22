import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '@/config/database/prisma.service';
import { Job } from 'bullmq';
import {
  NotificationJob,
  NOTIFICATIONS_QUEUE,
} from '@/shared/constants/all-constants';
import { Notification } from '@generated/prisma/client';

@Injectable()
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<NotificationJob>) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
    });

    if (!notification) {
      return;
    }

    try {
      if (notification.channel === 'EMAIL') {
        this.sendEmail(notification);
      } else {
        this.sendWhatsapp(notification);
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

  private sendEmail(notification: Notification) {
    console.info(
      `[notifications] email to=${notification.userId} subject=${notification.subject ?? ''}`,
    );
  }

  private sendWhatsapp(notification: Notification) {
    console.info(`[notifications] whatsapp to=${notification.userId}`);
  }
}
