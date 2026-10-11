import axios from 'axios';
import { z } from 'zod';
import { apiBaseUrl } from './session';
export const publicApi = axios.create({
  baseURL: apiBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 15000,
});
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const summary = z.object({ id: z.uuid(), name: z.string(), slug });
const mediaPath = z.string().regex(/^\/api\/v1\/media\/products\/[0-9a-f-]{36}\.webp$/u);
export const publicProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug,
  description: z.string(),
  price: z.string().regex(/^\d{1,10}\.\d{2}$/u),
  mainImage: mediaPath.nullable(),
  images: z.array(z.object({ url: mediaPath, position: z.number().int().nonnegative() })).max(6),
  business: summary.extend({ logo: z.string().nullable() }),
  category: summary,
});
export type PublicProduct = z.infer<typeof publicProductSchema>;
export const publicBusinessSchema = summary.extend({
  description: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  logo: z.string().nullable(),
  banner: z.string().nullable(),
});
export type PublicBusiness = z.infer<typeof publicBusinessSchema>;
const meta = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const productPageSchema = z.object({
  success: z.literal(true),
  data: z.array(publicProductSchema),
  meta,
});
export const businessPageSchema = z.object({
  success: z.literal(true),
  data: z.array(publicBusinessSchema),
  meta,
});
const categoryPageSchema = z.object({
  success: z.literal(true),
  data: z.array(summary.extend({ description: z.string() })),
  meta,
});
const pricePattern = /^\d{1,10}(?:\.\d{1,2})?$/u;
const amount = z
  .string()
  .trim()
  .refine(
    (value) => !value || pricePattern.test(value),
    'Usa un precio positivo con hasta dos decimales.',
  );
function cents(value: string): bigint {
  const [integer = '0', decimal = ''] = value.split('.');
  return BigInt(integer) * 100n + BigInt(decimal.padEnd(2, '0'));
}
export const filterSchema = z
  .object({
    search: z.string().trim().max(120, 'La búsqueda admite hasta 120 caracteres.'),
    categoryId: z.union([z.literal(''), z.uuid('Selecciona una categoría válida.')]),
    minPrice: amount,
    maxPrice: amount,
    sort: z.enum(['newest', 'price-asc', 'price-desc']),
  })
  .refine(
    (value) =>
      !pricePattern.test(value.minPrice) ||
      !pricePattern.test(value.maxPrice) ||
      cents(value.minPrice) <= cents(value.maxPrice),
    { message: 'El precio mínimo no puede superar al máximo.', path: ['maxPrice'] },
  );
export type Filters = z.infer<typeof filterSchema>;
const pageSchema = z
  .string()
  .regex(/^\d+$/u)
  .transform(Number)
  .pipe(z.number().int().min(1).max(10000));
export function readFilters(params: URLSearchParams) {
  for (const key of ['search', 'categoryId', 'minPrice', 'maxPrice', 'sort', 'page'])
    if (params.getAll(key).length > 1) throw new Error('Filtros repetidos');
  const filters = filterSchema.parse({
    search: params.get('search') ?? '',
    categoryId: params.get('categoryId') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    sort: params.get('sort') ?? 'newest',
  });
  return { ...filters, page: pageSchema.parse(params.get('page') ?? '1') };
}
export function filterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value && !(key === 'sort' && value === 'newest')) params.set(key, value);
  return params;
}
export function mediaUrl(path: string | null): string | null {
  if (!path || !mediaPath.safeParse(path).success) return null;
  const base = apiBaseUrl(import.meta.env.VITE_API_URL);
  return base.startsWith('http') ? new URL(path, base).href : path;
}
export function safeImageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function money(price: string): string {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(
    Number(price),
  );
}
export async function categories(signal?: AbortSignal) {
  // Fetch each bounded page: an active category beyond the first 50 must remain selectable.
  const data: z.infer<typeof summary>[] = [];
  let page = 1;
  while (true) {
    const result = categoryPageSchema.parse(
      (await publicApi.get('/categories', { params: { page, limit: 50 }, signal })).data,
    );
    data.push(...result.data);
    if (page >= result.meta.totalPages || result.data.length === 0) return data;
    page += 1;
    if (page > 10000) throw new Error('Límite de categorías');
  }
}
