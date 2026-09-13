import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'inventory-dbms-api',
    };
  }

  @Get('health/database')
  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'connected',
    };
  }
}