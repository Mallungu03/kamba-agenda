import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { DatabaseModule } from './config/database/database.module';
import { EnvModule } from './config/env/env.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { SalonsModule } from './modules/salons/salons.module';
import { ServicesModule } from './modules/services/services.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './shared/guards/auth.guard';

@Module({
  imports: [
    EnvModule,
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    SalonsModule,
    ServicesModule,
    UploadModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ProfessionalsModule,
    AppointmentsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
