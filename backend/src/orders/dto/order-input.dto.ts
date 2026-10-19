import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Matches, Max, Min } from 'class-validator';
import { CheckoutPreviewDto } from '../../checkout/dto/checkout-input.dto';
export class ConfirmOrderDto extends CheckoutPreviewDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') idempotencyKey!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) reviewVersion!: string;
}
export class ListOrdersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page: number = 1;
  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;
}
