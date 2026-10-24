import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsString, Matches, ValidateIf } from 'class-validator';
import { BusinessStatus, Role } from '../generated/prisma/client';
import { SellerBusinessResponse } from '../businesses/dto/business-response.dto';
import { ListBusinessesDto } from '../businesses/dto/list-businesses.dto';

export class AdminListBusinessesDto extends ListBusinessesDto {
  @ApiPropertyOptional({ enum: BusinessStatus })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;
}
export class ChangeBusinessStatusDto {
  @ApiProperty({ enum: BusinessStatus })
  @IsEnum(BusinessStatus)
  status!: BusinessStatus;

  @ApiProperty({ enum: BusinessStatus })
  @IsEnum(BusinessStatus)
  expectedStatus!: BusinessStatus;

  @ApiProperty({ format: 'date-time', description: 'Versión updatedAt del detalle consultado.' })
  @IsString()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u)
  expectedUpdatedAt!: string;
}
export class AdminBusinessOwner {
  @ApiProperty() name!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() isActive!: boolean;
}
export class AdminBusinessResponse extends SellerBusinessResponse {
  @ApiProperty({ type: AdminBusinessOwner }) owner!: AdminBusinessOwner;
  @ApiProperty({ enum: BusinessStatus, isArray: true }) allowedStatuses!: BusinessStatus[];
}
export class AdminPageMeta {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
export class AdminBusinessListResponse {
  @ApiProperty({ type: AdminBusinessResponse, isArray: true }) data!: AdminBusinessResponse[];
  @ApiProperty({ type: AdminPageMeta }) meta!: AdminPageMeta;
}
export class AdminUsersSummary {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() admins!: number;
  @ApiProperty() sellers!: number;
  @ApiProperty() customers!: number;
}
export class AdminBusinessesSummary {
  @ApiProperty() total!: number;
  @ApiProperty() pending!: number;
  @ApiProperty() active!: number;
  @ApiProperty() suspended!: number;
  @ApiProperty() rejected!: number;
}
export class AdminProductsSummary {
  @ApiProperty() total!: number;
  @ApiProperty({ description: 'Visibles según las reglas actuales del catálogo público.' })
  published!: number;
}
export class AdminOrdersSummary {
  @ApiProperty() total!: number;
  @ApiProperty() sellerOrders!: number;
  @ApiProperty() open!: number;
  @ApiProperty() delivered!: number;
  @ApiProperty() cancelled!: number;
  @ApiProperty({ description: 'Suma de subtotales no cancelados contra entrega; no son cobros.' })
  cashOnDeliveryTotal!: string;
  @ApiProperty({ description: 'Suma de subtotales simulados no cancelados; sin dinero real.' })
  simulatedTotal!: string;
  @ApiProperty({ enum: ['GTQ'] }) currency!: 'GTQ';
}
export class AdminDashboardResponse {
  @ApiProperty({ type: AdminUsersSummary }) users!: AdminUsersSummary;
  @ApiProperty({ type: AdminBusinessesSummary }) businesses!: AdminBusinessesSummary;
  @ApiProperty({ type: AdminProductsSummary }) products!: AdminProductsSummary;
  @ApiProperty({ type: AdminOrdersSummary }) orders!: AdminOrdersSummary;
}
