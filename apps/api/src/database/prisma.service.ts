import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

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
