import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { HealthResponse, ReadyResponse } from './health.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  live(): HealthResponse {
    return { success: true, status: 'ok', service: 'PatziShop API' };
  }

  async ready(): Promise<ReadyResponse> {
    try {
      await this.prisma.ping();
    } catch {
      throw new ServiceUnavailableException({
        message: 'Base de datos no disponible',
        error: 'DATABASE_UNAVAILABLE',
      });
    }
    return { ...this.live(), database: 'up' };
  }
}
