import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateBusinessDto {
  @ApiProperty({ minLength: 2, maxLength: 120, example: 'Tecnología Patzi' })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({
    minLength: 3,
    maxLength: 160,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    example: 'tecnologia-patzi',
  })
  @Transform(lower)
  @IsString()
  @Length(3, 160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  slug!: string;

  @ApiPropertyOptional({
    maxLength: 3000,
    description: 'Texto plano; omitir para usar una descripción vacía.',
  })
  @Transform(trim)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiProperty({ format: 'email', maxLength: 254, example: 'tienda@example.test' })
  @Transform(lower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 7, maxLength: 30, example: '+502 5555-0000' })
  @Transform(trim)
  @IsString()
  @Length(7, 30)
  @Matches(/^\+?[0-9][0-9 ()-]*$/u)
  phone!: string;

  @ApiProperty({ minLength: 5, maxLength: 500, example: 'Zona 1, Patzicía, Chimaltenango' })
  @Transform(trim)
  @IsString()
  @Length(5, 500)
  address!: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 2048,
    description: 'URL HTTP(S) pública, sin credenciales. null elimina el logo.',
  })
  @Transform(trim)
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
    disallow_auth: true,
  })
  @MaxLength(2048)
  logo?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 2048,
    description: 'URL HTTP(S) pública, sin credenciales. null elimina el banner.',
  })
  @Transform(trim)
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
    disallow_auth: true,
  })
  @MaxLength(2048)
  banner?: string | null;
}
