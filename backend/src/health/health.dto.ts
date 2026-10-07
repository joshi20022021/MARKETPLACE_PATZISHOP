import { ApiProperty } from '@nestjs/swagger';

export class HealthResponse {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'ok', enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ example: 'PatziShop API' })
  service!: string;
}

export class ReadyResponse extends HealthResponse {
  @ApiProperty({ example: 'up', enum: ['up'] })
  database!: 'up';
}
