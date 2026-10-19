import { ApiProperty } from '@nestjs/swagger';
import { CartResponse } from '../../carts/dto/cart-response.dto';
import { PaymentMethod } from '../../generated/prisma/client';
import { DeliveryDto } from './checkout-input.dto';
export class PaymentOption {
  @ApiProperty({ enum: PaymentMethod }) method!: PaymentMethod;
  @ApiProperty() label!: string;
  @ApiProperty() description!: string;
  @ApiProperty() simulation!: boolean;
}
export class PaymentPreparation extends PaymentOption {
  @ApiProperty({ enum: ['PENDING'] }) status!: 'PENDING';
  @ApiProperty({ enum: ['GTQ'] }) currency!: 'GTQ';
  @ApiProperty({ example: '125.50' }) amount!: string;
  @ApiProperty({ example: false }) requiresOnlinePayment!: false;
}
export class CheckoutOptions {
  @ApiProperty({ type: [PaymentOption] }) paymentMethods!: PaymentOption[];
  @ApiProperty({ enum: ['GT'] }) countryCode!: 'GT';
  @ApiProperty({ enum: ['GTQ'] }) currency!: 'GTQ';
  @ApiProperty({ example: true }) canPlaceOrder!: true;
}
export class CheckoutPreview {
  @ApiProperty({ enum: ['REVIEW_ONLY'] }) stage!: 'REVIEW_ONLY';
  @ApiProperty({ example: true }) canPlaceOrder!: true;
  @ApiProperty({ pattern: '^[a-f0-9]{64}$' }) reviewVersion!: string;
  @ApiProperty({ type: DeliveryDto }) delivery!: DeliveryDto;
  @ApiProperty({ type: CartResponse }) cart!: CartResponse;
  @ApiProperty({ type: PaymentPreparation }) payment!: PaymentPreparation;
  @ApiProperty({ type: String, nullable: true, description: 'No se ha cotizado envío.' })
  shippingTotal!: null;
}
