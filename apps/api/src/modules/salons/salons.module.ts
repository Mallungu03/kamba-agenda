import { Module } from '@nestjs/common';
import { SalonsService } from './salons.service';
import { SalonsController } from './salons.controller';
import { SalonsUseCases } from './salons.use-cases';
import { UploadModule } from '@/modules/upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [SalonsController],
  providers: [SalonsService, SalonsUseCases],
  exports: [SalonsService],
})
export class SalonsModule {}
