import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
  console.log("Kamba-Agenda API ON!");
  
}

bootstrap().catch((error) => {
  console.log(error);
  process.exit(1);
});
