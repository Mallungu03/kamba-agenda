import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { WaitlistUseCases } from './waitlist.use-cases';

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistUseCases],
})
export class WaitlistModule {}
