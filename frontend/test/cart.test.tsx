import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { AppRoutes } from '../src/routes/AppRoutes';
import { api, useSession } from '../src/services/session';
import { queryClient } from '../src/services/query-client';
import { cartError, cartSchema, quantitySchema } from '../src/services/cart';
import { publicApi } from '../src/services/marketplace';
const user = {
  id: '52a2334c-bdce-40b3-ade7-b9200a46c7a6',
  name: 'Cliente prueba',
  email: 'customer@example.test',
  role: 'CUSTOMER' as const,
};
const store = {
  id: '58948eaa-d5ec-45a2-b638-3e8696b7b65e',
  name: 'Tejidos Patzi',
  slug: 'tejidos-patzi',
  logo: null,
};
const otherStore = {
  ...store,
  id: '598c6835-07f2-4271-8fb1-a7bb6f8689d3',
  name: 'Taller Local',
  slug: 'taller-local',
};
const product = {
  id: 'cd6da741-3475-4a38-91b9-1ca2430be6e7',
  name: 'Bolso de telar',
  slug: 'bolso-de-telar',
  description: 'Producto local',
  price: '10.10',
  mainImage: null,
  images: [],
  business: store,
  category: { id: '0f7d5626-1052-4e1c-b9c4-22d60a43dadb', name: 'Artesanías', slug: 'artesanias' },
};
const item = {
  id: '2f927ec8-f8e3-42ba-8029-bc5d97a7a0eb',
  productId: product.id,
  quantity: 2,
  product,
  available: true,
  maxQuantity: 3,
  issue: null,
  lineTotal: '20.20',
};
const otherItem = {
  ...item,
  id: '0e4e87de-c78a-4ebd-ade2-fd04281278e2',
  productId: '31198b92-94e7-4b82-9eb1-96534c7b6b3f',
  quantity: 1,
  product: {
    ...product,
    id: '31198b92-94e7-4b82-9eb1-96534c7b6b3f',
    name: 'Cerámica',
    slug: 'ceramica',
    price: '5.00',
    business: otherStore,
  },
  lineTotal: '5.00',
};
const empty = {
  groups: [],
  itemCount: 0,
  quantityCount: 0,
  total: '0.00',
  subtotal: '0.00',
  hasIssues: false,
};
const full = {
  groups: [
    { business: store, items: [item], subtotal: '20.20' },
    { business: otherStore, items: [otherItem], subtotal: '5.00' },
  ],
  itemCount: 2,
  quantityCount: 3,
  total: '25.20',
  subtotal: '25.20',
  hasIssues: false,
};
function response(config: InternalAxiosRequestConfig, data: unknown) {
  return { config, data, status: 200, statusText: '', headers: new AxiosHeaders() };
}
function fail(config: InternalAxiosRequestConfig, error: string, status = 409) {
  return new AxiosError('Conflict', 'ERR_BAD_RESPONSE', config, undefined, {
    ...response(config, { error }),
    status,
  });
}
function open(path: string, from?: string) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: path, state: from ? { from } : null }]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  queryClient.clear();
  useSession.setState((state) => ({
    status: 'authenticated',
    user,
    token: 'test-access',
    epoch: state.epoch + 1,
  }));
});
it('contrato valida límites y conserva totales decimales mayores al precio unitario', () => {
  expect(cartSchema.parse(full).total).toBe('25.20');
  for (const quantity of [0, 100, -1, 1.5, '2'])
    expect(quantitySchema.safeParse(quantity).success).toBe(false);
  expect(cartSchema.safeParse({ ...full, total: 25.2 }).success).toBe(false);
  expect(cartSchema.safeParse({ ...empty, total: '9999999999999.00' }).success).toBe(true);
});
it('invitado vuelve a ingresar desde carrito y vendedor no consulta carritos', async () => {
  const requests = vi.fn();
  api.defaults.adapter = async (config) => {
    requests();
    return response(config, empty);
  };
  useSession.setState({ status: 'guest', user: null, token: null });
  open('/carrito');
  expect(await screen.findByRole('heading', { name: 'Ingresa a PatziShop' })).toBeTruthy();
  expect(requests).not.toHaveBeenCalled();
});
it('cuenta SELLER no obtiene carrito aunque navegue directamente', async () => {
  const requests = vi.fn();
  api.defaults.adapter = async (config) => {
    requests();
    return response(config, empty);
  };
  useSession.setState({ user: { ...user, role: 'SELLER' } });
  open('/carrito');
  expect(await screen.findByRole('heading', { name: 'El carrito es para clientes' })).toBeTruthy();
  expect(requests).not.toHaveBeenCalled();
});
it('retorno de login permite volver al carrito', async () => {
  api.defaults.adapter = async (config) => response(config, empty);
  open('/ingresar', '/carrito');
  expect(await screen.findByRole('heading', { name: 'Mi carrito.' })).toBeTruthy();
});
it('carrito vacío muestra catálogo sin inventar checkout ni compra', async () => {
  api.defaults.adapter = async (config) => response(config, empty);
  open('/carrito');
  expect(
    await screen.findByRole('heading', { name: 'Tu carrito está esperando algo especial' }),
  ).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Explorar productos' })).toHaveProperty(
    'href',
    expect.stringContaining('/catalogo'),
  );
  expect(screen.queryByRole('button', { name: /pagar|checkout/i })).toBeNull();
});
it('dos tiendas muestran totales del servidor; PATCH absoluto y DELETE actualizan la vista', async () => {
  const value = structuredClone(full);
  const writes: { method?: string; body: unknown; url?: string }[] = [];
  api.defaults.adapter = async (config) => {
    expect(config.headers.get('Authorization')).toBe('Bearer test-access');
    if (config.method === 'patch') {
      writes.push({
        method: config.method,
        body: JSON.parse(config.data as string),
        url: config.url,
      });
      value.groups[0]!.items[0]!.quantity = 3;
      value.groups[0]!.items[0]!.lineTotal = '30.30';
      value.groups[0]!.subtotal = '30.30';
      value.total = '35.30';
      value.subtotal = '35.30';
      value.quantityCount = 4;
    }
    if (config.method === 'delete') {
      writes.push({ method: config.method, body: undefined, url: config.url });
      value.groups.shift();
      value.total = '5.00';
      value.subtotal = '5.00';
      value.itemCount = 1;
      value.quantityCount = 1;
    }
    return response(config, value);
  };
  open('/carrito');
  expect(await screen.findByRole('heading', { name: 'Tejidos Patzi ↗' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Taller Local ↗' })).toBeTruthy();
  const actions = userEvent.setup();
  const field = screen.getByLabelText('Cantidad de Bolso de telar');
  await actions.clear(field);
  await actions.type(field, '3');
  await actions.click(screen.getAllByRole('button', { name: 'Guardar cantidad' })[0]!);
  await waitFor(() =>
    expect(screen.getByLabelText('Cantidad de Bolso de telar')).toHaveProperty('value', '3'),
  );
  expect(writes[0]).toEqual({
    method: 'patch',
    url: `/cart/items/${item.id}`,
    body: { quantity: 3 },
  });
  await actions.click(screen.getByRole('button', { name: 'Quitar Bolso de telar' }));
  await waitFor(() => expect(screen.queryByLabelText('Cantidad de Bolso de telar')).toBeNull());
  expect(writes[1]?.method).toBe('delete');
});
it('línea retirada se puede quitar sin revelar datos privados', async () => {
  let removed = false;
  const writes = vi.fn();
  const value = {
    ...empty,
    groups: [
      {
        business: null,
        items: [
          {
            ...item,
            product: null,
            maxQuantity: 0,
            available: false,
            issue: 'UNAVAILABLE',
            lineTotal: null,
          },
        ],
        subtotal: '0.00',
      },
    ],
    itemCount: 1,
    quantityCount: 2,
    hasIssues: true,
  };
  api.defaults.adapter = async (config) => {
    if (config.method === 'delete') {
      writes();
      removed = true;
    }
    return response(config, removed ? empty : value);
  };
  open('/carrito');
  expect(await screen.findByRole('heading', { name: 'Productos no disponibles' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Bolso de telar' })).toBeNull();
  expect(screen.getByLabelText('Cantidad de Producto no disponible')).toHaveProperty(
    'disabled',
    true,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Quitar Producto no disponible' }));
  await screen.findByRole('heading', { name: 'Tu carrito está esperando algo especial' });
  expect(writes).toHaveBeenCalledOnce();
});
it('stock reducido informa límite y no envía una cantidad superior', async () => {
  const writes = vi.fn();
  const value = {
    ...full,
    groups: [
      {
        business: store,
        items: [
          {
            ...item,
            quantity: 5,
            available: false,
            maxQuantity: 2,
            issue: 'INSUFFICIENT_STOCK',
            lineTotal: null,
          },
        ],
        subtotal: '0.00',
      },
    ],
    hasIssues: true,
    total: '0.00',
    subtotal: '0.00',
    itemCount: 1,
    quantityCount: 5,
  };
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') writes();
    return response(config, value);
  };
  open('/carrito');
  expect(await screen.findByText('Ahora puedes elegir hasta 2 unidades.')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cantidad' }));
  expect(await screen.findByText('Elige entre 1 y 2 unidades enteras.')).toBeTruthy();
  expect(writes).not.toHaveBeenCalled();
});
it('agregar desde producto envía ID y cantidad; éxito enlaza al carrito', async () => {
  const writes = vi.fn();
  publicApi.defaults.adapter = async (config) => response(config, product);
  api.defaults.adapter = async (config) => {
    writes(JSON.parse(config.data as string));
    return response(config, full);
  };
  open('/productos/bolso-de-telar');
  const button = await screen.findByRole('button', { name: 'Agregar al carrito' });
  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2' } });
  await userEvent.click(button);
  expect(await screen.findByRole('link', { name: 'Ver mi carrito ↗' })).toHaveProperty(
    'href',
    expect.stringContaining('/carrito'),
  );
  expect(writes).toHaveBeenCalledWith({ productId: product.id, quantity: 2 });
});
it('conflicto al agregar informa stock y conserva un formulario recuperable sin reintentos', async () => {
  const writes = vi.fn();
  publicApi.defaults.adapter = async (config) => response(config, product);
  api.defaults.adapter = async (config) => {
    writes();
    throw fail(config, 'INSUFFICIENT_STOCK');
  };
  open('/productos/bolso-de-telar');
  await userEvent.click(await screen.findByRole('button', { name: 'Agregar al carrito' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('supera la disponibilidad'),
  );
  expect(writes).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toHaveProperty(
    'disabled',
    false,
  );
});
it('fallo de red se distingue de carrito vacío y admite reintento', async () => {
  let offline = true;
  api.defaults.adapter = async (config) => {
    if (offline) throw new AxiosError('Offline', 'ERR_NETWORK', config);
    return response(config, empty);
  };
  open('/carrito');
  expect(await screen.findByRole('heading', { name: 'No pudimos cargar tu carrito' })).toBeTruthy();
  offline = false;
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(
    await screen.findByRole('heading', { name: 'Tu carrito está esperando algo especial' }),
  ).toBeTruthy();
});
it('respuesta privada pendiente tras logout no repuebla caché ni muestra datos', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = vi.fn();
  api.defaults.adapter = async (config) => {
    started();
    await pending;
    return response(config, full);
  };
  open('/carrito');
  await waitFor(() => expect(started).toHaveBeenCalled());
  await act(async () => {
    useSession.setState((state) => ({
      status: 'guest',
      user: null,
      token: null,
      epoch: state.epoch + 1,
    }));
    queryClient.clear();
    release();
  });
  expect(await screen.findByRole('heading', { name: 'Ingresa a PatziShop' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Tejidos Patzi ↗' })).toBeNull();
  expect(queryClient.getQueriesData({ queryKey: ['cart'] })).toEqual([]);
});
it('errores comerciales tienen mensajes concretos y límites distintos', () => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  expect(cartError(fail(config, 'CART_LIMIT'))).toContain('50 productos');
  expect(cartError(fail(config, 'QUANTITY_LIMIT'))).toContain('99 unidades');
  expect(cartError(fail(config, 'PRODUCT_UNAVAILABLE'))).toContain('ya no está disponible');
});
