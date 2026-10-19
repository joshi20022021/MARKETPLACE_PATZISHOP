import { ApiProperty } from '@nestjs/swagger';
import { DeliveryDto } from '../../checkout/dto/checkout-input.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '../../generated/prisma/client';
import { PublicProductCategory } from '../../products/dto/public-product-response.dto';
import { ProductPageMeta } from '../../products/dto/product-response.dto';
export class OrderItemResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotal!: string;
}
export class SellerOrderResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: PublicProductCategory }) business!: PublicProductCategory;
  @ApiProperty() subtotal!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ type: [OrderItemResponse] }) items!: OrderItemResponse[];
}
export class OrderResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() number!: number;
  @ApiProperty() total!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod!: PaymentMethod;
  @ApiProperty({ enum: PaymentStatus }) paymentStatus!: PaymentStatus;
  @ApiProperty() simulation!: boolean;
  @ApiProperty({ type: DeliveryDto }) delivery!: DeliveryDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: [SellerOrderResponse] }) sellerOrders!: SellerOrderResponse[];
}
export class SellerOrderDetail extends SellerOrderResponse {
  @ApiProperty({ format: 'uuid' }) orderId!: string;
  @ApiProperty() orderNumber!: number;
  @ApiProperty({ type: DeliveryDto }) delivery!: DeliveryDto;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod!: PaymentMethod;
  @ApiProperty({ enum: PaymentStatus }) paymentStatus!: PaymentStatus;
  @ApiProperty() simulation!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
export class OrderListResponse {
  @ApiProperty({ type: [OrderResponse] }) data!: OrderResponse[];
  @ApiProperty({ type: ProductPageMeta }) meta!: ProductPageMeta;
}
export class SellerOrderListResponse {
  @ApiProperty({ type: [SellerOrderDetail] }) data!: SellerOrderDetail[];
  @ApiProperty({ type: ProductPageMeta }) meta!: ProductPageMeta;
}
