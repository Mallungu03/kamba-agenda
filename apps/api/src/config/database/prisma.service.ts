import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EnvService } from '@/config/env/env.service';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly envService: EnvService) {
    const databaseUrl = envService.databaseUrl;

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error('Error connecting to the database:', error);
    }
  }

  async onModuleDestroy() {
    return this.$disconnect();
  }
}
