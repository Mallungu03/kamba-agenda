import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsUseCases } from './professionals.use-cases';

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, ProfessionalsUseCases],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
