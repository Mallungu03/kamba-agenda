import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class UploadService {
  readonly uploadPath = join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  isSafeFilename(name: string) {
    return !name.includes('..') && !name.includes('/') && !name.includes('\\');
  }

  getUploadPath(): string {
    return this.uploadPath;
  }
}
