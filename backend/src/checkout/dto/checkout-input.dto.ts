import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsDefined,
  IsEnum,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class DeliveryDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^\P{Cc}*$/u)
  recipientName!: string;
  @ApiProperty({ minLength: 7, maxLength: 30 })
  @Transform(trim)
  @IsString()
  @MinLength(7)
  @MaxLength(30)
  @Matches(/^\+?[0-9][0-9 ()-]*$/u)
  phone!: string;
  @ApiProperty({ minLength: 5, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  @Matches(/^\P{Cc}*$/u)
  addressLine!: string;
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^\P{Cc}*$/u)
  city!: string;
  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^\P{Cc}*$/u)
  region!: string;
  @ApiPropertyOptional({ maxLength: 20, default: '' })
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @Matches(/^[a-z0-9 -]*$/iu)
  postalCode: string = '';
  @ApiPropertyOptional({ enum: ['GT'], default: 'GT' })
  @Equals('GT')
  countryCode: string = 'GT';
  @ApiPropertyOptional({ maxLength: 1000, default: '' })
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  @Matches(/^[\P{Cc}\t\r\n]*$/u)
  deliveryInstructions: string = '';
}
export class CheckoutPreviewDto {
  @ApiProperty({ type: DeliveryDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryDto)
  delivery!: DeliveryDto;
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
