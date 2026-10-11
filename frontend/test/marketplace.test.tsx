import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { AppRoutes } from '../src/routes/AppRoutes';
import { queryClient } from '../src/services/query-client';
import { authTransport, useSession } from '../src/services/session';
import {
  categories,
  filterParams,
  mediaUrl,
  publicApi,
  publicProductSchema,
  readFilters,
  safeImageUrl,
} from '../src/services/marketplace';
const category = {
  id: '893f7286-8786-4a7e-8253-77bc718e7c02',
  name: 'Artesanías',
  slug: 'artesanias',
  description: 'Talento local',
};
const store = {
  id: 'c48f351f-0313-4c3a-93e3-6fa7bda80774',
  name: 'Tejidos Patzi',
  slug: 'tejidos-patzi',
  logo: null,
  banner: null,
  description: 'Tejidos de nuestra comunidad',
  email: 'tienda@example.test',
  phone: '+502 5555-0000',
  address: 'Zona 1, Patzicía',
};
const image1 = '/api/v1/media/products/84ae0597-1b21-477a-908c-27777911b71e.webp';
const image2 = '/api/v1/media/products/1e2a346b-898d-44f4-9c43-a3a6fa6ebca6.webp';
const product = {
  id: '0d3cc16c-b532-4b84-a951-9d8295c170b2',
  name: 'Bolso de telar',
  slug: 'bolso-de-telar',
  description: 'Tejido a mano\nHecho en Patzicía',
  price: '125.50',
  mainImage: image1,
  images: [
    { url: image1, position: 0 },
    { url: image2, position: 1 },
  ],
  category,
  business: store,
};
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: '', headers: new AxiosHeaders() };
}
function page(data: unknown[], total = data.length, current = 1) {
  return {
    success: true,
    data,
    meta: { page: current, limit: 12, total, totalPages: Math.ceil(total / 12) },
  };
}
function LocationNotice() {
  const location = useLocation();
  return (
    <output data-testid="url">
      {location.pathname}
      {location.search}
    </output>
  );
}
function open(path: string) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationNotice />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  queryClient.clear();
  useSession.setState((state) => ({
    status: 'guest',
    user: null,
    token: null,
    epoch: state.epoch + 1,
  }));
});
describe('contratos y transporte público', () => {
  it('valida URL compartida, límites, precisión y filtros repetidos', () => {
    const filters = readFilters(
      new URLSearchParams('page=2&search=telar&minPrice=0.10&maxPrice=125.50&sort=price-asc'),
    );
    expect(filters.page).toBe(2);
    expect(filters.minPrice).toBe('0.10');
    for (const query of [
      'page=-1',
      'page=10001',
      'page=1.5',
      'minPrice=1.001',
      'minPrice=0.11&maxPrice=0.10',
      'sort=stock',
      'page=1&page=2',
    ])
      expect(() => readFilters(new URLSearchParams(query))).toThrow();
    expect(
      filterParams({
        search: '',
        categoryId: '',
        minPrice: '',
        maxPrice: '',
        sort: 'newest',
      }).toString(),
    ).toBe('');
  });
  it('rechaza contratos con precio o media inválidos y URLs inseguras', () => {
    expect(publicProductSchema.safeParse(product).success).toBe(true);
    expect(publicProductSchema.safeParse({ ...product, price: 125.5 }).success).toBe(false);
    expect(
      publicProductSchema.safeParse({ ...product, mainImage: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(mediaUrl('/private/file')).toBeNull();
    expect(mediaUrl(image1)).toBe(image1);
    for (const url of [
      'javascript:alert(1)',
      'https://user:pass@example.test/logo',
      'data:image/svg+xml,evil',
    ])
      expect(safeImageUrl(url)).toBeNull();
  });
  it('lee categorías de páginas posteriores y respeta cancelación', async () => {
    const controller = new AbortController();
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.signal).toBe(controller.signal);
      return response(config, {
        success: true,
        data: [{ ...category, name: config.params.page === 1 ? 'Primera' : 'Segunda' }],
        meta: { page: config.params.page, limit: 50, total: 51, totalPages: 2 },
      });
    });
    publicApi.defaults.adapter = adapter;
    expect((await categories(controller.signal)).map((value) => value.name)).toEqual([
      'Primera',
      'Segunda',
    ]);
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it('no envía tokens privados ni renueva una sesión al recibir 401 público', async () => {
    useSession.setState({ token: 'private-token' });
    const auth = vi.fn();
    authTransport.defaults.adapter = auth;
    publicApi.defaults.adapter = async (config) => {
      expect(config.headers.get('Authorization')).toBeUndefined();
      throw new AxiosError(
        'Rejected',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        response(config, {}, 401),
      );
    };
    await expect(publicApi.get('/products')).rejects.toBeInstanceOf(AxiosError);
    expect(auth).not.toHaveBeenCalled();
  });
});
it('catálogo conecta filtros de URL y aplicar una búsqueda vuelve a página 1', async () => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
    response(
      config,
      config.url === '/categories'
        ? page([category])
        : page([product], 13, Number(config.params.page)),
    ),
  );
  publicApi.defaults.adapter = adapter;
  open(`/catalogo?page=2&categoryId=${category.id}&maxPrice=500`);
  expect(await screen.findByRole('heading', { name: 'Bolso de telar' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '← Anterior' }).getAttribute('href')).toContain('page=1');
  const request = adapter.mock.calls.find(([config]) => config.url === '/products')![0];
  expect(request.params).toMatchObject({
    page: 2,
    limit: 12,
    categoryId: category.id,
    maxPrice: '500',
  });
  await userEvent.type(screen.getByLabelText('Buscar productos'), 'telar');
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(screen.getByTestId('url').textContent).toContain('search=telar'));
  expect(screen.getByTestId('url').textContent).not.toContain('page=2');
});
it('rangos invertidos muestran validación sin nuevas solicitudes', async () => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
    response(config, config.url === '/categories' ? page([category]) : page([])),
  );
  publicApi.defaults.adapter = adapter;
  open('/catalogo');
  await screen.findByRole('heading', { name: 'Todavía no hay coincidencias' });
  const before = adapter.mock.calls.length;
  await userEvent.type(screen.getByLabelText('Desde'), '100');
  await userEvent.type(screen.getByLabelText('Hasta'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  expect(await screen.findByText('El precio mínimo no puede superar al máximo.')).toBeTruthy();
  expect(adapter.mock.calls.length).toBe(before);
});
it('un enlace inválido no consulta productos y permite limpiar filtros', async () => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, page([])));
  publicApi.defaults.adapter = adapter;
  open('/catalogo?page=0');
  expect(
    await screen.findByRole('heading', { name: 'Revisa los filtros del enlace' }),
  ).toBeTruthy();
  expect(adapter).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await screen.findByRole('heading', { name: 'Todavía no hay coincidencias' });
});
it('detalle muestra precio, galería seleccionable y enlaces reales a tienda y categoría', async () => {
  publicApi.defaults.adapter = async (config) => response(config, product);
  open('/productos/bolso-de-telar');
  await screen.findByRole('heading', { name: product.name });
  expect(screen.getByText(/125.50/u)).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Ver imagen 2 de Bolso de telar' }));
  expect(screen.getByRole('img', { name: product.name }).getAttribute('src')).toBe(image2);
  expect(screen.getByRole('link', { name: 'Visitar tienda ↗' }).getAttribute('href')).toBe(
    '/tiendas/tejidos-patzi',
  );
  fireEvent.error(screen.getByRole('img', { name: product.name }));
  expect(screen.getByRole('img', { name: `${product.name}: imagen no disponible` })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /comprar|carrito/iu })).toBeNull();
});
it('producto despublicado muestra 404 público y ningún dato del producto', async () => {
  publicApi.defaults.adapter = async (config) => {
    throw new AxiosError(
      'Missing',
      'ERR_BAD_REQUEST',
      config,
      undefined,
      response(config, {}, 404),
    );
  };
  open('/productos/bolso-de-telar');
  expect(
    await screen.findByRole('heading', { name: 'Este producto no está disponible' }),
  ).toBeTruthy();
  expect(screen.queryByText(product.description)).toBeNull();
});
it('tienda conecta contacto y filtra su catálogo sin aceptar una tienda de la query', async () => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
    response(
      config,
      config.url?.startsWith('/businesses/')
        ? store
        : config.url === '/categories'
          ? page([category])
          : page([product]),
    ),
  );
  publicApi.defaults.adapter = adapter;
  open('/tiendas/tejidos-patzi?businessSlug=otra');
  await screen.findByRole('heading', { name: product.name });
  expect(screen.getByRole('link', { name: store.email }).getAttribute('href')).toBe(
    `mailto:${store.email}`,
  );
  expect(
    adapter.mock.calls.find(([config]) => config.url === '/products')![0].params.businessSlug,
  ).toBe(store.slug);
});
it('directorio conecta búsqueda, paginación y enlaces a tiendas', async () => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
    response(config, page([store], 13)),
  );
  publicApi.defaults.adapter = adapter;
  open('/tiendas?search=tejidos');
  await screen.findByRole('heading', { name: store.name });
  expect(adapter.mock.calls[0]![0].params).toMatchObject({ search: 'tejidos', limit: 12, page: 1 });
  expect(screen.getByRole('link', { name: 'Siguiente →' }).getAttribute('href')).toContain(
    'page=2',
  );
});
it('fallo de red permite reintentar sin confundirlo con catálogo vacío', async () => {
  let offline = true;
  publicApi.defaults.adapter = async (config) => {
    if (config.url === '/products' && offline) throw new Error('offline');
    return response(config, config.url === '/categories' ? page([category]) : page([product]));
  };
  open('/catalogo');
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Todavía no hay coincidencias' })).toBeNull();
  offline = false;
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('heading', { name: product.name })).toBeTruthy();
});
