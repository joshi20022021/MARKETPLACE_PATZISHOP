import axios from 'axios';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, useSession } from './session';
import { publicProductSchema } from './marketplace';
import { errorMessage } from './errors';
const amount = z.string().regex(/^\d+\.\d{2}$/u);
export const quantitySchema = z.number().int().min(1).max(99);
const itemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  quantity: quantitySchema,
  product: publicProductSchema.nullable(),
  available: z.boolean(),
  maxQuantity: z.number().int().min(0).max(99),
  issue: z.enum(['UNAVAILABLE', 'INSUFFICIENT_STOCK']).nullable(),
  lineTotal: amount.nullable(),
});
export const cartSchema = z.object({
  groups: z.array(
    z.object({
      business: publicProductSchema.shape.business.nullable(),
      items: z.array(itemSchema),
      subtotal: amount,
    }),
  ),
  itemCount: z.number().int().min(0).max(50),
  quantityCount: z.number().int().min(0).max(4950),
  subtotal: amount,
  total: amount,
  hasIssues: z.boolean(),
});
export type CartItem = z.infer<typeof itemSchema>;
export function cartError(error: unknown): string {
  const code: unknown = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
  if (code === 'INSUFFICIENT_STOCK')
    return 'La cantidad supera la disponibilidad actual. Actualiza el carrito o elige menos unidades.';
  if (code === 'PRODUCT_UNAVAILABLE')
    return 'Este producto ya no está disponible. Puedes quitarlo del carrito.';
  if (code === 'QUANTITY_LIMIT') return 'Cada producto admite hasta 99 unidades en el carrito.';
  if (code === 'CART_LIMIT')
    return 'Tu carrito admite hasta 50 productos distintos. Quita alguno antes de agregar otro.';
  if (axios.isAxiosError(error) && !error.response)
    return 'No pudimos confirmar el cambio. Consulta tu carrito antes de volver a intentarlo.';
  return errorMessage(error);
}
export function useCart() {
  const session = useSession();
  return useQuery({
    queryKey: ['cart', session.user?.id, session.epoch],
    enabled: session.status === 'authenticated' && session.user?.role === 'CUSTOMER',
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => cartSchema.parse((await api.get('/cart', { signal })).data),
  });
}
type Change =
  | { method: 'add'; productId: string; quantity: number }
  | { method: 'update'; id: string; quantity: number }
  | { method: 'remove'; id: string };
export function useCartActions() {
  const session = useSession();
  const client = useQueryClient();
  const key = ['cart', session.user?.id, session.epoch];
  return useMutation({
    scope: { id: `cart-${session.user?.id}` },
    retry: false,
    mutationFn: async (change: Change) => {
      if (useSession.getState().epoch !== session.epoch) throw new Error('SESSION_CHANGED');
      const response =
        change.method === 'add'
          ? await api.post('/cart/items', {
              productId: change.productId,
              quantity: quantitySchema.parse(change.quantity),
            })
          : change.method === 'update'
            ? await api.patch(`/cart/items/${change.id}`, {
                quantity: quantitySchema.parse(change.quantity),
              })
            : await api.delete(`/cart/items/${change.id}`);
      return cartSchema.parse(response.data);
    },
    onSuccess: (value) => {
      if (useSession.getState().epoch === session.epoch) client.setQueryData(key, value);
    },
    onSettled: () => {
      if (useSession.getState().epoch === session.epoch)
        void client.invalidateQueries({ queryKey: key });
    },
  });
}
