import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { SignInDto } from './dto/signin.dto';
import { UpdateAuthDto } from './dto/update.dto';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { RegisterUseCase } from './use-cases/register.use-case';
import { SignInUseCase } from './use-cases/sign-in.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registerUseCase: RegisterUseCase,
    private readonly signInUseCase: SignInUseCase,

  ) {}

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.registerUseCase.execute(registerDto);
  }

  @Public()
  @Post('login')
  login(@Body() signInDto: SignInDto) {
    return this.signInUseCase.execute(signInDto);
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @Post('logout')
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @Patch('refresh')
  refreshTokens(@Body() body: { refreshToken: string }) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  @Patch('alter-password')
  alterPassword(
    @CurrentUser('id') userId: string,
    @Body() updateAuthDto: UpdateAuthDto,
  ) {
    return this.authService.alterPassword(updateAuthDto, userId);
  }
}
