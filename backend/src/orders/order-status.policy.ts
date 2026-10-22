import type { OrderStatus } from '../generated/prisma/client';
const SELLER_NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
export function nextOrderStatuses(status: OrderStatus, role: 'SELLER' | 'CUSTOMER'): OrderStatus[] {
  return role === 'SELLER'
    ? [...SELLER_NEXT[status]]
    : ['PENDING', 'CONFIRMED'].includes(status)
      ? ['CANCELLED']
      : [];
}
