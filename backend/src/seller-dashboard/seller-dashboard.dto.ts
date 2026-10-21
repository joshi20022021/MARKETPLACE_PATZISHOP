import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '../generated/prisma/enums';
export class DashboardBusiness {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: BusinessStatus }) status!: BusinessStatus;
}
export class DashboardProducts {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() inactive!: number;
  @ApiProperty() outOfStock!: number;
  @ApiProperty({ description: 'Productos con 1–5 unidades, de cualquier estado.' })
  lowStock!: number;
}
export class DashboardOrders {
  @ApiProperty() total!: number;
  @ApiProperty() open!: number;
  @ApiProperty() delivered!: number;
  @ApiProperty() cancelled!: number;
  @ApiProperty({
    description: 'Subtotal histórico no cancelado contra entrega; no equivale a cobros.',
  })
  cashOnDeliveryTotal!: string;
  @ApiProperty({ description: 'Subtotal histórico simulado no cancelado; sin dinero real.' })
  simulatedTotal!: string;
  @ApiProperty({ enum: ['GTQ'] }) currency!: 'GTQ';
}
export class SellerDashboardResponse {
  @ApiProperty({ type: DashboardBusiness, nullable: true }) business!: DashboardBusiness | null;
  @ApiProperty({ type: DashboardProducts }) products!: DashboardProducts;
  @ApiProperty({ type: DashboardOrders }) orders!: DashboardOrders;
}
