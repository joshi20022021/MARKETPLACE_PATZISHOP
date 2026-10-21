import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { api, useSession } from '../src/services/session';
import { publicApi } from '../src/services/marketplace';
import { queryClient } from '../src/services/query-client';
import { productInputSchema, productPatch, sellerProductSchema } from '../src/services/seller';
const user = {
  id: '52a2334c-bdce-40b3-ade7-b9200a46c7a6',
  name: 'Vendedora prueba',
  email: 'seller@example.test',
  role: 'SELLER' as const,
};
const shop = {
  id: '58948eaa-d5ec-45a2-b638-3e8696b7b65e',
  ownerId: user.id,
  name: 'Tejidos de prueba',
  slug: 'tejidos',
  description: '',
  email: user.email,
  phone: '55550000',
  address: 'Dirección ficticia',
  logo: null,
  banner: null,
  status: 'ACTIVE',
  createdAt: '2026-10-20T12:00:00.000Z',
  updatedAt: '2026-10-20T12:00:00.000Z',
};
const category = {
  id: '0f7d5626-1052-4e1c-b9c4-22d60a43dadb',
  name: 'Artesanías',
  slug: 'artesanias',
  description: '',
};
const original = {
  id: 'cd6da741-3475-4a38-91b9-1ca2430be6e7',
  businessId: shop.id,
  categoryId: category.id,
  name: 'Bolso de prueba',
  slug: 'bolso',
  description: 'Tejido',
  price: '10.10',
  stock: 3,
  sku: 'BOLSO-1',
  status: 'ACTIVE',
  mainImage: null,
  images: [] as { id: string; url: string; position: number }[],
  createdAt: shop.createdAt,
  updatedAt: shop.updatedAt,
};
const meta = { page: 1, limit: 12, total: 1, totalPages: 1 };
const summary = {
  business: { id: shop.id, name: shop.name, slug: shop.slug, status: 'ACTIVE' },
  products: { total: 3, active: 1, inactive: 1, outOfStock: 1, lowStock: 1 },
  orders: {
    total: 2,
    open: 2,
    delivered: 0,
    cancelled: 0,
    cashOnDeliveryTotal: '10.10',
    simulatedTotal: '0.20',
    currency: 'GTQ',
  },
};
let current: typeof original;
let business: typeof shop | null;
let calls: { method: string; url: string; body: unknown; params: unknown }[];
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: '', headers: new AxiosHeaders() };
}
function failed(config: InternalAxiosRequestConfig, status: number, error: string) {
  return new AxiosError(
    'Test error',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    response(config, { error }, status),
  );
}
function open(path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const editPath = `/vendedor/productos/${original.id}/editar`;
beforeEach(() => {
  queryClient.clear();
  useSession.setState((s) => ({
    status: 'authenticated',
    user,
    token: 'test',
    epoch: s.epoch + 1,
  }));
  current = structuredClone(original);
  business = { ...shop };
  calls = [];
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:private-test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  publicApi.defaults.adapter = async (config) =>
    response(config, { success: true, data: [category], meta: { ...meta, limit: 50 } });
  api.defaults.adapter = async (config) => {
    const url = config.url ?? '';
    const method = config.method ?? 'get';
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    calls.push({ url, method, body, params: config.params });
    if (url === '/seller/business') {
      if (!business) throw failed(config, 404, 'RESOURCE_NOT_FOUND');
      return response(config, business);
    }
    if (url === '/seller/dashboard')
      return response(config, { ...summary, business: business ? summary.business : null });
    if (url.endsWith('/file'))
      return response(config, new Blob(['fixture'], { type: 'image/webp' }));
    if (url.endsWith('/images') && method === 'post') {
      current = {
        ...current,
        images: [
          {
            id: '2f927ec8-f8e3-42ba-8029-bc5d97a7a0eb',
            url: '/api/v1/media/products/2f927ec8-f8e3-42ba-8029-bc5d97a7a0eb.webp',
            position: 0,
          },
        ],
      };
      return response(config, current, 201);
    }
    if (url === '/seller/products' && method === 'get')
      return response(config, {
        success: true,
        data: [current],
        meta: { ...meta, page: config.params.page, total: 13, totalPages: 2 },
      });
    if (url === '/seller/products' && method === 'post') {
      current = { ...current, ...body };
      return response(config, current, 201);
    }
    if (url === `/seller/products/${original.id}`) {
      if (method === 'patch') current = { ...current, ...body };
      return response(
        config,
        method === 'delete' ? undefined : current,
        method === 'delete' ? 204 : 200,
      );
    }
    throw new Error(`Unexpected ${method} ${url}`);
  };
});
it('contrato rechaza precio inválido y fracciones; PATCH omite stock no editado', () => {
  const valid = {
    name: original.name,
    slug: original.slug,
    description: original.description,
    categoryId: category.id,
    price: original.price,
    stock: 3,
    sku: original.sku,
    status: 'ACTIVE' as const,
  };
  expect(productInputSchema.safeParse(valid).success).toBe(true);
  for (const patch of [
    { price: '1,20' },
    { price: '-1' },
    { stock: 1.5 },
    { stock: -1 },
    { categoryId: 'bad' },
    { status: 'ADMIN' },
  ])
    expect(productInputSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  expect(
    productPatch({ ...valid, name: 'Nuevo nombre' }, sellerProductSchema.parse(original)),
  ).toEqual({ name: 'Nuevo nombre' });
});
it.each(['CUSTOMER', 'ADMIN'] as const)(
  'panel rechaza rol %s sin consultar datos privados',
  async (role) => {
    useSession.setState({ user: { ...user, role } });
    open('/vendedor');
    expect(await screen.findByText('Esta sección es para vendedores')).toBeTruthy();
    expect(calls).toHaveLength(0);
  },
);
it('invitado recibe login con retorno al panel', async () => {
  useSession.setState({ status: 'guest', user: null, token: null });
  open('/vendedor/productos');
  expect(await screen.findByRole('heading', { name: 'Ingresa a PatziShop' })).toBeTruthy();
  expect(calls).toHaveLength(0);
});
it('muestra métricas propias y distingue importes de simulación y cobros', async () => {
  open('/vendedor');
  expect(await screen.findByText('Tejidos de prueba')).toBeTruthy();
  expect(screen.getByText(/No equivale a dinero cobrado/)).toBeTruthy();
  expect(screen.getByText(/Sin cobro de dinero real/)).toBeTruthy();
  expect(calls.filter((c) => c.url === '/seller/dashboard')).toHaveLength(1);
});
it('sin tienda ofrece creación y no confunde un error de red con estado vacío', async () => {
  const normal = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    if (config.url === '/seller/dashboard') throw failed(config, 503, 'UNAVAILABLE');
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open('/vendedor');
  await screen.findByRole('alert');
  expect(screen.queryByText('Tu tienda empieza aquí')).toBeNull();
  api.defaults.adapter = async (config) => response(config, { ...summary, business: null });
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Tu tienda empieza aquí')).toBeTruthy();
});
it('lista, filtra y pagina productos conservando búsqueda y estado en URL', async () => {
  open('/vendedor/productos');
  await screen.findByRole('heading', { name: original.name });
  fireEvent.change(screen.getByLabelText('Buscar nombre o SKU'), { target: { value: 'BOLSO' } });
  fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ACTIVE' } });
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() =>
    expect(calls.filter((c) => c.url === '/seller/products').at(-1)?.params).toMatchObject({
      page: 1,
      search: 'BOLSO',
      status: 'ACTIVE',
    }),
  );
  await userEvent.click(screen.getByRole('link', { name: 'Siguiente →' }));
  await waitFor(() =>
    expect(calls.filter((c) => c.url === '/seller/products').at(-1)?.params).toMatchObject({
      page: 2,
      search: 'BOLSO',
      status: 'ACTIVE',
    }),
  );
});
it('filtros inválidos y tienda ausente no consultan productos ajenos', async () => {
  open('/vendedor/productos?page=0');
  await screen.findByText('Revisa los filtros del enlace');
  expect(calls.some((c) => c.url === '/seller/products')).toBe(false);
  business = null;
  queryClient.clear();
  await userEvent.click(screen.getByRole('button', { name: 'Restablecer filtros' }));
  await screen.findByText('Primero presenta tu tienda');
  expect(calls.some((c) => c.url === '/seller/products')).toBe(false);
});
it('crea producto inactivo sin IDs privilegiados y abre edición', async () => {
  business = { ...shop, status: 'PENDING' };
  open('/vendedor/productos/nuevo');
  await screen.findByLabelText('Nombre del producto');
  for (const [label, value] of [
    ['Nombre del producto', 'Nuevo bolso'],
    ['Identificador del producto', 'nuevo-bolso'],
    ['SKU', 'NUEVO-1'],
    ['Precio (GTQ)', '15.25'],
    ['Existencias', '4'],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: category.id } });
  await userEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
  await screen.findByRole('button', { name: 'Guardar producto' });
  const write = calls.find((c) => c.method === 'post')!;
  expect(write.body).toEqual({
    name: 'Nuevo bolso',
    slug: 'nuevo-bolso',
    sku: 'NUEVO-1',
    price: '15.25',
    stock: 4,
    status: 'INACTIVE',
    categoryId: category.id,
    description: '',
  });
  expect(calls.filter((c) => c.method === 'post')).toHaveLength(1);
});
it('editar solo nombre no reenvía existencias ni estado; conserva SKU privado', async () => {
  open(editPath);
  await screen.findByLabelText('Nombre del producto');
  fireEvent.change(screen.getByLabelText('Nombre del producto'), {
    target: { value: 'Bolso editado' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  await screen.findByText('Producto guardado.');
  expect(calls.find((c) => c.method === 'patch')?.body).toEqual({ name: 'Bolso editado' });
});
it('eliminación exige segundo paso y explica referencias históricas', async () => {
  const normal = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    if (config.method === 'delete') {
      calls.push({ method: 'delete', url: config.url!, body: null, params: null });
      throw failed(config, 409, 'PRODUCT_IN_USE');
    }
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open(editPath);
  await screen.findByRole('button', { name: 'Eliminar producto' });
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar producto' }));
  expect(calls.some((c) => c.method === 'delete')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByText(/El producto tiene historial de compras/)).toBeTruthy();
  expect(calls.filter((c) => c.method === 'delete')).toHaveLength(1);
});
it('fallo incierto bloquea reenvío hasta consultar el producto otra vez', async () => {
  const normal = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') {
      calls.push({ method: 'patch', url: config.url!, body: null, params: null });
      throw new AxiosError('Network', 'ERR_NETWORK', config);
    }
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open(editPath);
  await screen.findByLabelText('Nombre del producto');
  fireEvent.change(screen.getByLabelText('Nombre del producto'), {
    target: { value: 'Nombre incierto' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  await screen.findByRole('button', { name: 'Volver a cargar datos' });
  expect(screen.getByRole('button', { name: 'Guardar producto' }).matches(':disabled')).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  expect(calls.filter((c) => c.method === 'patch')).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar datos' }));
  await waitFor(() =>
    expect((screen.getByLabelText('Nombre del producto') as HTMLInputElement).value).toBe(
      original.name,
    ),
  );
});
it('imágenes usan multipart y vista previa privada con blob liberado al salir', async () => {
  const view = open(editPath);
  await screen.findByLabelText('Seleccionar imagen');
  await userEvent.upload(
    screen.getByLabelText('Seleccionar imagen'),
    new File(['fixture'], 'bolso.png', { type: 'image/png' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Subir imagen' }));
  await screen.findByAltText('Vista previa privada del producto');
  expect(calls.find((c) => c.url.endsWith('/images') && c.method === 'post')?.body).toBeInstanceOf(
    FormData,
  );
  expect(calls.some((c) => c.url.endsWith('/file'))).toBe(true);
  expect(URL.createObjectURL).toHaveBeenCalled();
  expect((screen.getByLabelText('Seleccionar imagen') as HTMLInputElement).value).toBe('');
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-test');
});
it('tienda suspendida permite consultar y deshabilita edición y carga', async () => {
  business = { ...shop, status: 'SUSPENDED' };
  open(editPath);
  await screen.findByLabelText('Nombre del producto');
  expect(
    (screen.getByLabelText('Nombre del producto') as HTMLInputElement).disabled ||
      screen.getByLabelText('Nombre del producto').closest('fieldset')?.disabled,
  ).toBe(true);
  expect((screen.getByRole('button', { name: 'Subir imagen' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  expect(screen.queryByRole('button', { name: 'Eliminar producto' })).toBeNull();
});
it('elimina producto sin historial con segundo paso y regresa al listado', async () => {
  const normal = api.defaults.adapter;
  let removed = false;
  api.defaults.adapter = async (config) => {
    if (config.method === 'delete') {
      removed = true;
      calls.push({ method: 'delete', url: config.url!, body: null, params: null });
      return response(config, undefined, 204);
    }
    if (config.url === '/seller/products' && removed)
      return response(config, {
        success: true,
        data: [],
        meta: { ...meta, total: 0, totalPages: 0 },
      });
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open(editPath);
  await screen.findByRole('button', { name: 'Eliminar producto' });
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar producto' }));
  await userEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
  expect(await screen.findByText('No hay productos en esta página')).toBeTruthy();
  expect(calls.filter((c) => c.method === 'delete')).toHaveLength(1);
});
it('respuesta de escritura tras logout no navega ni vuelve a poblar caché privada', async () => {
  const normal = api.defaults.adapter;
  let finish: () => void = () => {};
  let started = false;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') {
      started = true;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return response(config, { ...original, name: 'Tardío' });
    }
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open(editPath);
  await screen.findByLabelText('Nombre del producto');
  fireEvent.change(screen.getByLabelText('Nombre del producto'), { target: { value: 'Tardío' } });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar producto' }));
  await waitFor(() => expect(started).toBe(true));
  act(() => {
    useSession.setState((s) => ({ status: 'guest', user: null, token: null, epoch: s.epoch + 1 }));
    queryClient.clear();
  });
  await act(async () => finish());
  await screen.findByRole('heading', { name: 'Ingresa a PatziShop' });
  expect(screen.queryByText('Producto guardado.')).toBeNull();
  expect(queryClient.getQueriesData({ queryKey: ['seller-product'] })).toHaveLength(0);
});
it('crear y salir antes de recibir respuesta no fuerza regreso al formulario', async () => {
  const normal = api.defaults.adapter;
  let finish: () => void = () => {};
  let started = false;
  api.defaults.adapter = async (config) => {
    if (config.method === 'post') {
      started = true;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return response(config, current, 201);
    }
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open('/vendedor/productos/nuevo');
  await screen.findByLabelText('Nombre del producto');
  for (const [label, value] of [
    ['Nombre del producto', 'Borrador tardío'],
    ['Identificador del producto', 'borrador-tardio'],
    ['SKU', 'TARDIO'],
    ['Precio (GTQ)', '1.00'],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: category.id } });
  await userEvent.click(screen.getByRole('button', { name: 'Crear producto' }));
  await waitFor(() => expect(started).toBe(true));
  await userEvent.click(screen.getByRole('link', { name: 'Mis productos' }));
  await screen.findByRole('heading', { name: 'Mis productos.' });
  await act(async () => finish());
  expect(screen.queryByRole('button', { name: 'Guardar producto' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Mis productos.' })).toBeTruthy();
});
