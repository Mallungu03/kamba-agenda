import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/signin.dto';
import { UpdateAuthDto } from './dto/update.dto';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DeviceContextDto } from './dto/device-context.dto';
import type { Request } from 'express';
import { AuthUseCases } from './auth.use-cases';

@Controller('auth')
export class AuthController {
  constructor(private readonly authUseCases: AuthUseCases) {}

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto, @Req() request: Request) {
    return this.authUseCases.register(registerDto, request);
  }

  @Public()
  @Post('login')
  login(
    @Body() signInDto: SignInDto & DeviceContextDto,
    @Req() request: Request,
  ) {
    return this.authUseCases.sigin(signInDto, request);
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.authUseCases.me(userId);
  }

  @Post('logout')
  logout(
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.authUseCases.signout(userId, deviceId);
  }

  @Public()
  @Patch('refresh')
  refreshTokens(@Body() body: RefreshTokenDto) {
    return this.authUseCases.refreshTokens(body);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authUseCases.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authUseCases.resetPassword(dto);
  }

  @Post('verify-email/request')
  requestEmailVerification(@CurrentUser('id') userId: string) {
    return this.authUseCases.requestEmailVerification(userId);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authUseCases.verifyEmail(dto);
  }

  @Get('sessions')
  listSessions(@CurrentUser('id') userId: string) {
    return this.authUseCases.listSessions(userId);
  }

  @Delete('sessions/:deviceId')
  revokeSession(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.authUseCases.revokeSession(userId, deviceId);
  }

  @Patch('alter-password')
  alterPassword(
    @CurrentUser('id') userId: string,
    @Body() updateAuthDto: UpdateAuthDto,
  ) {
    return this.authUseCases.alterPassword(updateAuthDto, userId);
  }
}
