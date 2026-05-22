import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/config/database/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NotificationChannel,
  NotificationStatus,
} from '../../../generated/prisma/client';
import {
  NotificationJob,
  NOTIFICATIONS_QUEUE,
} from '@/shared/constants/all-constants';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<NotificationJob>,
  ) {}

  async createAndQueue(dto: {
    userId: string;
    channel: NotificationChannel;
    subject?: string;
    content: string;
  }) {
    const data = { ...dto, status: NotificationStatus.PENDING };
    const notification = await this.prisma.notification.create({ data });
    await this.enqueue(notification.id);
    return notification;
  }

  async enqueue(notificationId: string) {
    await this.queue.add(
      'send',
      { notificationId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: true,
      },
    );
  }
}
