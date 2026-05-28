import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import {
  v2 as cloudinary,
  DeleteApiResponse,
  UploadApiResponse,
} from 'cloudinary';
import { EnvService } from '@/config/env/env.service';

@Injectable()
export class UploadService {
  readonly uploadPath = join(process.cwd(), 'uploads');

  constructor(private readonly envService: EnvService) {
    if (!this.isProduction() && !existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }

    if (this.isProduction()) {
      cloudinary.config({
        cloud_name: this.envService.cloudinaryName,
        api_key: this.envService.cloudinaryKey,
        api_secret: this.envService.cloudinarySecret,
      });
    }
  }

  isProduction() {
    return this.envService.nodeEnv === 'production';
  }

  isSafeFilename(name: string) {
    return !name.includes('..') && !name.includes('/') && !name.includes('\\');
  }

  getUploadPath(): string {
    return this.uploadPath;
  }

  async uploadFile(file: Express.Multer.File) {
    if (!this.isProduction()) {
      return {
        originalName: file.originalname,
        filename: file.filename,
        encoding: file.encoding,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.filename}`,
      };
    }

    if (!file.buffer) {
      throw new Error('File buffer is required for production uploads.');
    }

    const publicId = `uploads/${Date.now()}-${this.sanitizeFilename(
      file.originalname,
    )}`;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: 'kamba-agenda',
          resource_type: 'auto',
          overwrite: true,
        },
        (error: unknown, uploadResponse: UploadApiResponse | undefined) => {
          if (error) {
            const message =
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : (JSON.stringify(error) ?? 'Cloudinary upload failed.');

            return reject(new Error(message));
          }
          if (!uploadResponse) {
            return reject(new Error('Cloudinary upload failed.'));
          }
          resolve(uploadResponse);
        },
      );

      stream.end(file.buffer);
    });

    return {
      originalName: file.originalname,
      filename: result.public_id,
      mimeType: result.resource_type,
      size: file.size,
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async removeFile(filename: string) {
    if (this.isProduction()) {
      const result = (await cloudinary.uploader.destroy(filename, {
        resource_type: 'auto',
      })) as DeleteApiResponse;

      const deletionResult = result as { result?: string };

      return {
        deleted:
          deletionResult.result === 'ok' ||
          deletionResult.result === 'not found',
      };
    }

    if (!this.isSafeFilename(filename)) {
      throw new Error('Invalid filename');
    }

    const fullPath = join(this.uploadPath, filename);
    unlinkSync(fullPath);

    return { deleted: true };
  }

  private sanitizeFilename(name: string) {
    const extension = name.includes('.') ? `.${name.split('.').pop()}` : '';
    const baseName = name.replace(extension, '');
    return baseName.replace(/[^a-zA-Z0-9-_.]/g, '-').toLowerCase();
  }
}
