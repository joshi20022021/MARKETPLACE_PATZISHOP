import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { LoginDto } from './login.dto';
import { MaxByteLength } from '../../common/validators/max-byte-length';

export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 2, maxLength: 120, example: 'María López' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ format: 'password', writeOnly: true, minLength: 12, maxLength: 72 })
  @MinLength(12)
  @IsString()
  @MaxByteLength(72)
  declare password: string;

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'SELLER'], default: 'CUSTOMER' })
  @IsOptional()
  @IsIn(['CUSTOMER', 'SELLER'])
  role?: 'CUSTOMER' | 'SELLER';
}
