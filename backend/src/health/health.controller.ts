import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../common/api-error.dto';
import { HealthResponse, ReadyResponse } from './health.dto';
import { HealthService } from './health.service';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Comprobar que el proceso HTTP responde' })
  @ApiOkResponse({ type: HealthResponse })
  live(): HealthResponse {
    return this.health.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Comprobar conexión con PostgreSQL' })
  @ApiOkResponse({ type: ReadyResponse })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponse })
  ready(): Promise<ReadyResponse> {
    return this.health.ready();
  }
}
