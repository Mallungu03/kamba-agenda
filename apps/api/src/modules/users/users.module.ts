import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersUseCases } from './users.use-cases';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersUseCases],
  exports: [UsersService],
})
export class UsersModule {}
