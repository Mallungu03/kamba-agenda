import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadUseCases } from './upload.use-cases';

@Module({
  controllers: [UploadController],
  providers: [UploadService, UploadUseCases],
  exports: [UploadService],
})
export class UploadModule {}
