import { createHash } from 'node:crypto';
import type { CartResponse } from '../carts/dto/cart-response.dto';
import type { CheckoutPreviewDto, DeliveryDto } from './dto/checkout-input.dto';
export function deliverySnapshot(value: DeliveryDto): DeliveryDto {
  return {
    recipientName: value.recipientName,
    phone: value.phone,
    addressLine: value.addressLine,
    city: value.city,
    region: value.region,
    postalCode: value.postalCode,
    countryCode: value.countryCode,
    deliveryInstructions: value.deliveryInstructions,
  };
}
export const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function reviewVersion(
  userId: string,
  input: CheckoutPreviewDto,
  cart: CartResponse,
): string {
  const items = cart.groups
    .flatMap((group) =>
      group.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.product?.name,
        price: item.product?.price,
        businessId: group.business?.id,
      })),
    )
    .sort((a, b) => a.productId.localeCompare(b.productId));
  return digest({
    userId,
    delivery: deliverySnapshot(input.delivery),
    paymentMethod: input.paymentMethod,
    currency: 'GTQ',
    items,
  });
}
