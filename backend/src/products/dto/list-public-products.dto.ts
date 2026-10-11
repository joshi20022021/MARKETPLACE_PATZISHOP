import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ListCategoriesDto } from '../../categories/dto/list-categories.dto';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class ListPublicProductsDto extends ListCategoriesDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  businessSlug?: string;
  @ApiPropertyOptional({ enum: ['newest', 'price-asc', 'price-desc'], default: 'newest' })
  @IsIn(['newest', 'price-asc', 'price-desc'])
  sort: 'newest' | 'price-asc' | 'price-desc' = 'newest';
  @ApiPropertyOptional({
    type: String,
    example: '10.00',
    description: 'Importe inclusivo, hasta 10 enteros y 2 decimales.',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/u)
  minPrice?: string;
  @ApiPropertyOptional({ type: String, example: '500.00' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}(?:\.\d{1,2})?$/u)
  maxPrice?: string;
}
