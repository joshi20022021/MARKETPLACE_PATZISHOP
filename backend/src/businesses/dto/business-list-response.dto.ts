import { ApiProperty } from '@nestjs/swagger';
import { PublicBusinessResponse } from './business-response.dto';

export class BusinessPageMeta {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class BusinessListResponse {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: [PublicBusinessResponse] }) data!: PublicBusinessResponse[];
  @ApiProperty({ type: BusinessPageMeta }) meta!: BusinessPageMeta;
}
