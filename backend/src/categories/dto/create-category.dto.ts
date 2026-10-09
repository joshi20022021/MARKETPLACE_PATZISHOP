import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @ApiProperty({ minLength: 2, maxLength: 80, example: 'Tecnología' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({
    minLength: 3,
    maxLength: 100,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    example: 'tecnologia',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  slug!: string;

  @ApiPropertyOptional({ maxLength: 3000, default: '' })
  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'false oculta la categoría en la consulta pública.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto, {
  skipNullProperties: false,
}) {}
