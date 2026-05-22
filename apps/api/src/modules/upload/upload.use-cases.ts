import { Injectable } from '@nestjs/common';
import { UploadService } from './upload.service';
import { unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadUseCases {
  constructor(private readonly uploadService: UploadService) {}

  uploadFile(file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      filename: file.filename,
      encoding: file.encoding,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    };
  }

  removeFile(filename: string, _requesterId: string) {
    if (!this.uploadService.isSafeFilename(filename)) {
      throw new Error('Invalid filename');
    }

    const full = join(this.uploadService.uploadPath, filename);

    try {
      unlinkSync(full);
      return { deleted: true };
    } catch (e) {
      console.log(e);
      throw new Error('File not found or could not be deleted');
    }
  }
}
