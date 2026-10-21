import { z } from 'zod';
import axios from 'axios';
import { api, useSession } from './session';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { businessSchema } from './contracts';
import { errorMessage, statusOf } from './errors';
export const productStates = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', OUT_OF_STOCK: 'Agotado' };
export const businessStates = {
  ACTIVE: 'Activa',
  PENDING: 'En revisión',
  SUSPENDED: 'Suspendida',
  REJECTED: 'No aprobada',
};
const status = z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']);
const count = z.number().int().nonnegative();
const amount = z.string().regex(/^\d+\.\d{2}$/u);
const meta = z.object({ page: count, limit: count, total: count, totalPages: count });
export const sellerProductSchema = z.object({
  id: z.uuid(),
  businessId: z.uuid(),
  categoryId: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price: amount,
  stock: count,
  sku: z.string(),
  status,
  mainImage: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  images: z.array(z.object({ id: z.uuid(), url: z.string(), position: count })).max(6),
});
export type SellerProduct = z.infer<typeof sellerProductSchema>;
export const sellerProductsSchema = z.object({
  success: z.literal(true),
  data: z.array(sellerProductSchema),
  meta,
});
export const dashboardSchema = z.object({
  business: z
    .object({
      id: z.uuid(),
      name: z.string(),
      slug: z.string(),
      status: businessSchema.shape.status,
    })
    .nullable(),
  products: z.object({
    total: count,
    active: count,
    inactive: count,
    outOfStock: count,
    lowStock: count,
  }),
  orders: z.object({
    total: count,
    open: count,
    delivered: count,
    cancelled: count,
    cashOnDeliveryTotal: amount,
    simulatedTotal: amount,
    currency: z.literal('GTQ'),
  }),
});
export const productInputSchema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre del producto.').max(180),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Usa letras, números y guiones.'),
  description: z.string().trim().max(10000),
  categoryId: z.uuid('Selecciona una categoría disponible.'),
  price: z
    .string()
    .trim()
    .regex(
      /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/u,
      'Usa un precio de hasta dos decimales, sin comas.',
    ),
  sku: z.string().trim().min(1, 'Escribe un SKU.').max(80),
  stock: z.number().int('Usa unidades enteras.').min(0).max(2147483647),
  status,
});
export type ProductInput = z.infer<typeof productInputSchema>;
export function productPatch(input: ProductInput, product: SellerProduct): Partial<ProductInput> {
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => value !== product[key as keyof ProductInput]),
  );
}
export function useSellerBusiness() {
  const session = useSession();
  return useQuery({
    queryKey: ['seller-business', session.user?.id, session.epoch],
    enabled: session.user?.role === 'SELLER',
    queryFn: async ({ signal }) => {
      try {
        return businessSchema.parse((await api.get('/seller/business', { signal })).data);
      } catch (error) {
        if (statusOf(error) === 404) return null;
        throw error;
      }
    },
  });
}
export function invalidateSeller(client: QueryClient) {
  for (const queryKey of [
    ['seller-products'],
    ['seller-product'],
    ['seller-dashboard'],
    ['public-products'],
    ['public-product'],
    ['cart'],
  ])
    void client.invalidateQueries({ queryKey });
}
export function sellerError(error: unknown): string {
  const code: unknown = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
  if (code === 'PRODUCT_IN_USE')
    return 'El producto tiene historial de compras. Puedes desactivarlo para conservar sus referencias.';
  if (code === 'PRODUCT_IDENTIFIER_UNAVAILABLE') return 'Ese identificador o SKU ya está en uso.';
  if (code === 'CATEGORY_UNAVAILABLE')
    return 'La categoría ya no está disponible. Selecciona otra o desactiva el producto.';
  if (code === 'PUBLICATION_NOT_ALLOWED')
    return 'Tu tienda necesita aprobación antes de activar productos.';
  if (code === 'STOCK_STATUS_CONFLICT')
    return 'Para reponer un producto agotado, cambia su estado a Activo o Inactivo.';
  if (axios.isAxiosError(error) && (!error.response || error.response.status >= 500))
    return 'No pudimos comprobar si se guardó el cambio. Actualiza los datos antes de volver a enviarlo.';
  return errorMessage(error);
}
export function sellerFilters(params: URLSearchParams) {
  for (const key of ['search', 'status', 'page'])
    if (params.getAll(key).length > 1) throw new Error('Filtros repetidos');
  return z
    .object({
      search: z.string().trim().max(120),
      status: z.union([z.literal(''), status]),
      page: z.string().regex(/^\d+$/u).transform(Number).pipe(z.number().int().min(1).max(10000)),
    })
    .parse({
      search: params.get('search') ?? '',
      status: params.get('status') ?? '',
      page: params.get('page') ?? '1',
    });
}
