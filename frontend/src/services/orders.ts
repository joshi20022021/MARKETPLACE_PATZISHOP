import axios from 'axios';
import { z } from 'zod';
import { deliverySchema } from './checkout';
import { errorMessage } from './errors';
const money = z.string().regex(/^\d+\.\d{2}$/u);
const status = z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export const orderSchema = z.object({
  id: z.uuid(),
  number: z.number().int().positive(),
  total: money,
  currency: z.literal('GTQ'),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'SIMULATED']),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']),
  simulation: z.boolean(),
  delivery: deliverySchema,
  createdAt: z.iso.datetime(),
  sellerOrders: z.array(
    z.object({
      id: z.uuid(),
      business: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }),
      subtotal: money,
      status,
      items: z.array(
        z.object({
          id: z.uuid(),
          productId: z.uuid(),
          productName: z.string(),
          unitPrice: money,
          quantity: z.number().int().positive(),
          lineTotal: money,
        }),
      ),
    }),
  ),
});
export const orderListSchema = z.object({
  data: z.array(orderSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export type Order = z.infer<typeof orderSchema>;
export const orderStatus: Record<z.infer<typeof status>, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};
const storageKey = (userId: string) => `patzishop-order-attempt:${userId}`;
export function pendingOrderKey(userId: string): string | null {
  try {
    const value = sessionStorage.getItem(storageKey(userId));
    return z.uuid().safeParse(value).success ? value : null;
  } catch {
    return null;
  }
}
export function rememberOrderKey(userId: string, key: string): void {
  try {
    sessionStorage.setItem(storageKey(userId), key);
  } catch {
    /* The in-memory attempt still has the same key; order history allows manual recovery. */
  }
}
export function clearOrderKey(userId: string): void {
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch {
    /* Storage may be unavailable. */
  }
}
export function orderError(error: unknown): string {
  const code: unknown = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
  if (code === 'CHECKOUT_CHANGED')
    return 'Los productos o datos cambiaron. Revisa de nuevo antes de confirmar.';
  if (code === 'CART_NEEDS_ATTENTION' || code === 'EMPTY_CART')
    return 'Tu carrito cambió. Revisa sus productos y cantidades.';
  if (code === 'ORDER_TOTAL_LIMIT')
    return 'Este importe supera el límite de un pedido. Reduce las cantidades.';
  if (code === 'IDEMPOTENCY_KEY_REUSED')
    return 'Este intento ya corresponde a otra compra. Consulta tus pedidos.';
  return errorMessage(error);
}
export function uncertainOrder(error: unknown): boolean {
  return (
    !axios.isAxiosError(error) ||
    !error.response ||
    error.response.status >= 500 ||
    error.response.data?.error === 'CHECKOUT_BUSY'
  );
}
