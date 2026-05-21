import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { RegisterUseCase } from './use-cases/register.use-case';
import { SignInUseCase } from './use-cases/sign-in.use-case';

@Module({
  controllers: [AuthController],
  providers: [AuthService, RegisterUseCase, SignInUseCase],
  exports: [AuthService],
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('env.jwt.secret'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>('env.jwt.expiresIn'),
        },
      }),
    }),
  ],
})
export class AuthModule {}
