import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const integer = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[0-9]+$/u.test(value) ? Number(value) : value;

export class ListBusinessesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 12;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Busca nombre o descripción sin distinguir mayúsculas; % y _ son literales.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
