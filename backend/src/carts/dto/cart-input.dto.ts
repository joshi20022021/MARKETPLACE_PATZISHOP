import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
export class CartQuantityDto {
  @ApiProperty({ minimum: 1, maximum: 99, example: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}
export class AddCartItemDto extends CartQuantityDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() productId!: string;
}
