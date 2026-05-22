import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServicesUseCases } from './services.use-cases';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, ServicesUseCases],
  exports: [ServicesService],
})
export class ServicesModule {}
