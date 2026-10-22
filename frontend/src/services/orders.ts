import axios from 'axios';
import { z } from 'zod';
import { deliverySchema } from './checkout';
import { errorMessage } from './errors';
const money = z.string().regex(/^\d+\.\d{2}$/u);
export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);
const status = orderStatusSchema;
export const orderHistorySchema = z.array(
  z.object({
    id: z.uuid(),
    fromStatus: status.nullable(),
    toStatus: status,
    note: z.string().nullable(),
    createdAt: z.iso.datetime(),
  }),
);
export const orderPartSchema = z.object({
  id: z.uuid(),
  business: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }),
  subtotal: money,
  status,
  // Older read-only API responses remain displayable; they never enable state actions.
  allowedStatuses: z.array(status).default([]),
  history: orderHistorySchema.default([]),
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
});
export const orderSchema = z.object({
  id: z.uuid(),
  number: z.number().int().positive(),
  total: money,
  activeProductsTotal: money.optional(),
  currency: z.literal('GTQ'),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'SIMULATED']),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']),
  simulation: z.boolean(),
  delivery: deliverySchema,
  createdAt: z.iso.datetime(),
  sellerOrders: z.array(orderPartSchema),
});
export const sellerOrderSchema = orderPartSchema.extend({
  orderId: z.uuid(),
  orderNumber: z.number().int().positive(),
  delivery: deliverySchema,
  paymentMethod: orderSchema.shape.paymentMethod,
  paymentStatus: orderSchema.shape.paymentStatus,
  simulation: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type OrderPart = z.infer<typeof orderPartSchema>;
export type SellerOrder = z.infer<typeof sellerOrderSchema>;
export type OrderState = z.infer<typeof status>;
export function readSellerOrderFilters(params: URLSearchParams) {
  for (const key of ['page', 'status'])
    if (params.getAll(key).length > 1) throw new Error('Filtros repetidos');
  return z
    .object({
      status: z.union([z.literal(''), status]),
      page: z.string().regex(/^\d+$/u).transform(Number).pipe(z.number().int().min(1).max(10000)),
    })
    .parse({ status: params.get('status') ?? '', page: params.get('page') ?? '1' });
}
export const statusNoteSchema = z
  .string()
  .trim()
  .max(500, 'La nota admite hasta 500 caracteres.')
  .regex(/^[\P{Cc}\t\r\n]*$/u, 'La nota contiene caracteres no permitidos.');
export function transitionError(error: unknown): string {
  const code: unknown = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
  if (code === 'ORDER_STATE_CHANGED')
    return 'El pedido cambió. Vuelve a consultar su estado antes de continuar.';
  if (code === 'ORDER_TRANSITION_INVALID')
    return 'Ese cambio ya no está permitido. Consulta el estado actual.';
  if (code === 'ORDER_STOCK_UNAVAILABLE')
    return 'No hay disponibilidad para confirmar este subpedido.';
  if (code === 'ORDER_STOCK_LIMIT' || code === 'ORDER_INVENTORY_INVALID')
    return 'No se pudo ajustar el inventario. Consulta el pedido y revisa sus existencias.';
  return errorMessage(error);
}
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
export const sellerOrderListSchema = z.object({
  data: z.array(sellerOrderSchema),
  meta: orderListSchema.shape.meta,
});
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
