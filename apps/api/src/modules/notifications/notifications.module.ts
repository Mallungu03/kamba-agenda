import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsListener } from './notifications.listener';
import { NotificationsUseCases } from './notifications.use-cases';
import { NOTIFICATIONS_QUEUE } from '@/shared/constants/all-constants';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    NotificationsListener,
    NotificationsUseCases,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
