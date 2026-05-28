import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { EnvService } from '@/config/env/env.service';
import { AuthUseCases } from './auth.use-cases';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthUseCases],
  exports: [AuthService],
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [EnvService],
      useFactory: (envService: EnvService) => ({
        secret: envService.jwtAccessSecret,
        signOptions: {
          expiresIn: envService.jwtAccessExpiresIn,
        },
      }),
    }),
  ],
})
export class AuthModule {}
