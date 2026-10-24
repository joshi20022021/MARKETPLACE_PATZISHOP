import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums';
import { CheckoutPreviewDto } from '../../checkout/dto/checkout-input.dto';
const integer = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[0-9]+$/u.test(value) ? Number(value) : value;
export class ConfirmOrderDto extends CheckoutPreviewDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') idempotencyKey!: string;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) @Matches(/^[a-f0-9]{64}$/u) reviewVersion!: string;
}
export class CancelSellerOrderDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) expectedStatus!: OrderStatus;
  @ApiPropertyOptional({ maxLength: 500, description: 'Nota visible al cliente y al vendedor.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  @Matches(/^[\P{Cc}\t\r\n]*$/u)
  note: string = '';
}
export class ChangeSellerOrderStatusDto extends CancelSellerOrderDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status!: OrderStatus;
}
export class ListOrdersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(10000)
  page: number = 1;
  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;
}
export class ListSellerOrdersDto extends ListOrdersDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
