import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  Delete,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { UploadUseCases } from './upload.use-cases';

const isProduction = process.env.NODE_ENV === 'production';
const uploadDirectory = join(process.cwd(), 'uploads');

const localStorage = diskStorage({
  destination: uploadDirectory,
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const fileExtName = extname(file.originalname);
    const sanitizedBaseName = file.originalname
      .replace(fileExtName, '')
      .replace(/[^a-zA-Z0-9-_.]/g, '-')
      .toLowerCase();

    callback(null, `${sanitizedBaseName}-${timestamp}${fileExtName}`);
  },
});

const storage = isProduction ? memoryStorage() : localStorage;

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadUseCases: UploadUseCases) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadUseCases.uploadFile(file);
  }

  @Delete(':filename')
  removeFile(@Param('filename') filename: string) {
    return this.uploadUseCases.removeFile(filename);
  }
}
