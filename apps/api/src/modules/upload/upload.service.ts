import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { unlinkSync } from 'fs';

function isSafeFilename(name: string) {
  return !name.includes('..') && !name.includes('/') && !name.includes('\\');
}

@Injectable()
export class UploadService {
  private readonly uploadPath = join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  getUploadPath(): string {
    return this.uploadPath;
  }

  buildFileResponse(file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      filename: file.filename,
      encoding: file.encoding,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    };
  }

  deleteFile(filename: string, _requesterId: string) {
    if (!isSafeFilename(filename)) {
      throw new Error('Invalid filename');
    }

    const full = join(this.uploadPath, filename);

    try {
      unlinkSync(full);
      return { deleted: true };
    } catch (e) {
      throw new Error('File not found or could not be deleted');
    }
  }
}
