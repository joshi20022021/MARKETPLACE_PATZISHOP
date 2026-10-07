import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 503 })
  statusCode!: number;

  @ApiProperty({
    example: 'Base de datos no disponible',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({ example: 'DATABASE_UNAVAILABLE' })
  error!: string;

  @ApiProperty({ example: '/api/v1/health/ready' })
  path!: string;

  @ApiProperty({ example: '2026-10-06T12:00:00.000Z' })
  timestamp!: string;
}
