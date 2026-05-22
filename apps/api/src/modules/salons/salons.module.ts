import { Module } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { SalonsUseCases } from './salons.use-cases';

@Module({
  controllers: [SalonsController],
  providers: [SalonsService, SalonsUseCases],
  exports: [SalonsService],
})
export class SalonsModule {}
