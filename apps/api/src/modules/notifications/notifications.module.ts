import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsUseCases } from './notifications.use-cases';
import { NOTIFICATIONS_QUEUE } from '@/shared/constants/all-constants';
import { NotificationsListener } from './listeners/notifications.listener';
import { EmailProvider } from './providers/email.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    NotificationsListener,
    NotificationsUseCases,
    EmailProvider,
    WhatsappProvider,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
