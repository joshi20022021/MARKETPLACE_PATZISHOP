import { Prisma } from '../generated/prisma/client';
import { OrderResponse, SellerOrderDetail, SellerOrderResponse } from './dto/order-response.dto';
const DELIVERY_SELECT = {
  recipientName: true,
  phone: true,
  addressLine: true,
  city: true,
  region: true,
  postalCode: true,
  countryCode: true,
  deliveryInstructions: true,
} as const;
const HEADER_SELECT = {
  id: true,
  number: true,
  createdAt: true,
  paymentMethod: true,
  paymentStatus: true,
  ...DELIVERY_SELECT,
} as const;
const PART_SELECT = {
  id: true,
  subtotal: true,
  status: true,
  business: { select: { id: true, name: true, slug: true } },
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.SellerOrderSelect;
export const ORDER_SELECT = {
  ...HEADER_SELECT,
  total: true,
  currency: true,
  sellerOrders: { select: PART_SELECT, orderBy: { id: 'asc' } },
} satisfies Prisma.OrderSelect;
export const SELLER_ORDER_SELECT = {
  ...PART_SELECT,
  createdAt: true,
  order: { select: HEADER_SELECT },
} satisfies Prisma.SellerOrderSelect;
type Header = Prisma.OrderGetPayload<{ select: typeof HEADER_SELECT }>;
function delivery(value: Header) {
  return {
    recipientName: value.recipientName,
    phone: value.phone,
    addressLine: value.addressLine,
    city: value.city,
    region: value.region,
    postalCode: value.postalCode ?? '',
    countryCode: value.countryCode,
    deliveryInstructions: value.deliveryInstructions ?? '',
  };
}
function part(
  value: Prisma.SellerOrderGetPayload<{ select: typeof PART_SELECT }>,
): SellerOrderResponse {
  return {
    id: value.id,
    business: value.business,
    subtotal: value.subtotal.toFixed(2),
    status: value.status,
    items: value.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    })),
  };
}
export function orderResponse(
  value: Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>,
): OrderResponse {
  return {
    id: value.id,
    number: value.number,
    total: value.total.toFixed(2),
    currency: value.currency,
    paymentMethod: value.paymentMethod,
    paymentStatus: value.paymentStatus,
    simulation: value.paymentMethod === 'SIMULATED',
    delivery: delivery(value),
    createdAt: value.createdAt.toISOString(),
    sellerOrders: value.sellerOrders.map(part),
  };
}
export function sellerOrderResponse(
  value: Prisma.SellerOrderGetPayload<{ select: typeof SELLER_ORDER_SELECT }>,
): SellerOrderDetail {
  return {
    ...part(value),
    orderId: value.order.id,
    orderNumber: value.order.number,
    delivery: delivery(value.order),
    paymentMethod: value.order.paymentMethod,
    paymentStatus: value.order.paymentStatus,
    simulation: value.order.paymentMethod === 'SIMULATED',
    createdAt: value.createdAt.toISOString(),
  };
}
