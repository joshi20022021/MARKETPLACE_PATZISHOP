import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MaxByteLength } from '../../common/validators/max-byte-length';

export class LoginDto {
  @ApiProperty({ example: 'cliente@example.com', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ format: 'password', writeOnly: true, maxLength: 72 })
  @IsString()
  @MinLength(1)
  @MaxByteLength(72)
  password!: string;
}
