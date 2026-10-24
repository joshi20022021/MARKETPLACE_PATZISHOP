import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { businessSchema } from './contracts';
import { api, useSession } from './session';
export const businessStatusSchema = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']);
const count = z.number().int().nonnegative();
const amount = z.string().regex(/^\d+\.\d{2}$/u);
export const adminBusinessSchema = businessSchema.extend({
  owner: z.object({
    name: z.string(),
    role: z.enum(['ADMIN', 'SELLER', 'CUSTOMER']),
    isActive: z.boolean(),
  }),
  allowedStatuses: z.array(businessStatusSchema),
});
export type AdminBusiness = z.infer<typeof adminBusinessSchema>;
export const adminBusinessesSchema = z.object({
  data: z.array(adminBusinessSchema),
  meta: z.object({ page: count, limit: count, total: count, totalPages: count }),
});
export const adminDashboardSchema = z.object({
  users: z.object({ total: count, active: count, admins: count, sellers: count, customers: count }),
  businesses: z.object({
    total: count,
    pending: count,
    active: count,
    suspended: count,
    rejected: count,
  }),
  products: z.object({ total: count, published: count }),
  orders: z.object({
    total: count,
    sellerOrders: count,
    open: count,
    delivered: count,
    cancelled: count,
    cashOnDeliveryTotal: amount,
    simulatedTotal: amount,
    currency: z.literal('GTQ'),
  }),
});
export function readAdminFilters(params: URLSearchParams) {
  for (const key of ['page', 'search', 'status'])
    if (params.getAll(key).length > 1) throw new Error('Filtros repetidos');
  return z
    .object({
      page: z.string().regex(/^\d+$/u).transform(Number).pipe(z.number().int().min(1).max(10000)),
      search: z.string().trim().max(120),
      status: z.union([z.literal(''), businessStatusSchema]),
    })
    .parse({
      page: params.get('page') ?? '1',
      search: params.get('search') ?? '',
      status: params.get('status') ?? '',
    });
}
export function useAdminBusiness(id: string) {
  const session = useSession();
  return useQuery({
    queryKey: ['admin-business', session.user?.id, session.epoch, id],
    enabled: session.user?.role === 'ADMIN',
    queryFn: async ({ signal }) =>
      adminBusinessSchema.parse(
        (await api.get(`/admin/businesses/${encodeURIComponent(id)}`, { signal })).data,
      ),
  });
}
export const adminActions = {
  ACTIVE: 'Aprobar tienda',
  SUSPENDED: 'Suspender tienda',
  REJECTED: 'Rechazar tienda',
  PENDING: 'Volver a revisión',
};
