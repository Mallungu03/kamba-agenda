import { Injectable } from '@nestjs/common';
import { UploadService } from './upload.service';

@Injectable()
export class UploadUseCases {
  constructor(private readonly uploadService: UploadService) {}

  async uploadFile(file: Express.Multer.File) {
    return this.uploadService.uploadFile(file);
  }

  async removeFile(filename: string) {
    return this.uploadService.removeFile(filename);
  }
}
