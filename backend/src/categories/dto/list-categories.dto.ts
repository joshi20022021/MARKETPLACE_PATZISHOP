import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const integer = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[0-9]+$/u.test(value) ? Number(value) : value;

export class ListCategoriesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Busca nombre o descripción; %, _ y barra inversa son literales.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class AdminListCategoriesDto extends ListCategoriesDto {
  @ApiPropertyOptional({ description: 'Omitir para consultar activas e inactivas.' })
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
