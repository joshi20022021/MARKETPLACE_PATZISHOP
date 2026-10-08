import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '../../generated/prisma/client';

export class PublicBusinessResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: String, nullable: true }) logo!: string | null;
  @ApiProperty({ type: String, nullable: true }) banner!: string | null;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() address!: string;
}

export class SellerBusinessResponse extends PublicBusinessResponse {
  @ApiProperty({ format: 'uuid' }) ownerId!: string;
  @ApiProperty({ enum: BusinessStatus }) status!: BusinessStatus;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}

export const PUBLIC_BUSINESS_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logo: true,
  banner: true,
  email: true,
  phone: true,
  address: true,
} as const;
export const SELLER_BUSINESS_SELECT = {
  ...PUBLIC_BUSINESS_SELECT,
  ownerId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;
