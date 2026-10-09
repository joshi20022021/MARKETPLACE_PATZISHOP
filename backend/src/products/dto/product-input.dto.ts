import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ProductStatus } from '../../generated/prisma/enums';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateProductDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() categoryId!: string;
  @ApiProperty({ minLength: 2, maxLength: 180 })
  @Transform(trim)
  @IsString()
  @Length(2, 180)
  name!: string;
  @ApiProperty({ minLength: 3, maxLength: 220, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  slug!: string;
  @ApiProperty({ maxLength: 10000 })
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  description!: string;
  @ApiProperty({
    type: String,
    example: '125.50',
    description: 'GTQ decimal como texto, 0–9999999999.99, máximo dos decimales.',
  })
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/u)
  price!: string;
  @ApiProperty({ minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  sku!: string;
  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 2147483647 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  stock?: number;
  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.INACTIVE })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
export class UpdateProductDto extends PartialType(CreateProductDto, {
  skipNullProperties: false,
}) {}
