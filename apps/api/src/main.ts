import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('env.api.port');
  const host = configService.getOrThrow<string>('env.api.host');

  await app.listen(port, host);
  console.log('Kamba-Agenda API ON!');
}

bootstrap().catch((error) => {
  console.log(error);
  process.exit(1);
});
