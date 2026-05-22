import { Controller, Get } from '@nestjs/common';
import { Public } from './shared/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHealthMessage() {
    return 'Kamba-Agenda API ON!';
  }
}
