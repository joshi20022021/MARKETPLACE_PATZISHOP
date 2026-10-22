import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, expect, it } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { api, useSession } from '../src/services/session';
import { queryClient } from '../src/services/query-client';
import {
  sellerOrderSchema,
  statusNoteSchema,
  orderStatusSchema,
  type SellerOrder,
} from '../src/services/orders';
const user = {
  id: '52a2334c-bdce-40b3-ade7-b9200a46c7a6',
  name: 'Vendedor ficticio',
  email: 'seller@example.test',
  role: 'SELLER' as const,
};
const id = '76e5d381-4015-4689-a24e-091a451d0e74';
const orderId = 'ca99de8c-50a8-4876-b698-72c4d4b761fc';
const base = {
  id,
  orderId,
  orderNumber: 42,
  business: { id: '58948eaa-d5ec-45a2-b638-3e8696b7b65e', name: 'Tienda ficticia', slug: 'tienda' },
  subtotal: '20.20',
  status: 'CONFIRMED',
  allowedStatuses: ['PREPARING', 'CANCELLED'],
  history: [
    {
      id: '2f927ec8-f8e3-42ba-8029-bc5d97a7a0eb',
      fromStatus: null,
      toStatus: 'CONFIRMED',
      note: 'Compra confirmada',
      createdAt: '2026-10-21T12:00:00.000Z',
    },
  ],
  items: [
    {
      id: 'cd6da741-3475-4a38-91b9-1ca2430be6e7',
      productId: '0f7d5626-1052-4e1c-b9c4-22d60a43dadb',
      productName: 'Bolso histórico',
      unitPrice: '10.10',
      quantity: 2,
      lineTotal: '20.20',
    },
  ],
  delivery: {
    recipientName: 'Cliente ficticio',
    phone: '55550000',
    addressLine: 'Dirección ficticia de prueba',
    city: 'Patzicía',
    region: 'Chimaltenango',
    countryCode: 'GT',
    postalCode: '',
    deliveryInstructions: '',
  },
  paymentMethod: 'CASH_ON_DELIVERY',
  paymentStatus: 'PENDING',
  simulation: false,
  createdAt: '2026-10-21T12:00:00.000Z',
};
const sellerPath = `/vendedor/pedidos/${id}`;
let part: SellerOrder;
let writes: { url: string; body: Record<string, unknown> }[];
let reads: { url: string; params: unknown }[];
function response(config: InternalAxiosRequestConfig, data: unknown) {
  return { config, data, status: 200, statusText: '', headers: new AxiosHeaders() };
}
function failed(config: InternalAxiosRequestConfig, status: number, error: string) {
  return new AxiosError('Fixture error', 'ERR_BAD_RESPONSE', config, undefined, {
    ...response(config, { error }),
    status,
  });
}
function receipt() {
  return {
    id: orderId,
    number: 42,
    total: '20.20',
    activeProductsTotal: part.status === 'CANCELLED' ? '0.00' : '20.20',
    currency: 'GTQ',
    paymentMethod: part.paymentMethod,
    paymentStatus: part.paymentStatus,
    simulation: part.simulation,
    delivery: part.delivery,
    createdAt: part.createdAt,
    sellerOrders: [{ ...part, allowedStatuses: part.status === 'CONFIRMED' ? ['CANCELLED'] : [] }],
  };
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
beforeEach(() => {
  queryClient.clear();
  useSession.setState((s) => ({
    status: 'authenticated',
    user,
    token: 'fixture',
    epoch: s.epoch + 1,
  }));
  part = sellerOrderSchema.parse(structuredClone(base));
  writes = [];
  reads = [];
  api.defaults.adapter = async (config) => {
    const url = config.url ?? '';
    if (config.method === 'patch') {
      const body = JSON.parse(config.data as string) as Record<string, unknown>;
      writes.push({ url, body });
      const next = orderStatusSchema.parse(body.status ?? 'CANCELLED');
      part = {
        ...part,
        status: next,
        allowedStatuses: next === 'PREPARING' ? ['SHIPPED', 'CANCELLED'] : [],
        history: [
          ...part.history,
          {
            id: crypto.randomUUID(),
            fromStatus: part.status,
            toStatus: next,
            note: (body.note as string) || null,
            createdAt: '2026-10-21T12:01:00.000Z',
          },
        ],
      };
      return response(config, part);
    }
    reads.push({ url, params: config.params });
    if (url === '/seller/orders')
      return response(config, {
        data: [part],
        meta: { page: config.params.page, limit: 12, total: 13, totalPages: 2 },
      });
    if (url === `/seller/orders/${id}`) return response(config, part);
    if (url === `/orders/${orderId}`) return response(config, receipt());
    throw new Error(`Unexpected ${config.method} ${url}`);
  };
});
it('valida historial y nota; respuesta antigua queda consultable sin habilitar acciones', () => {
  expect(statusNoteSchema.safeParse('x'.repeat(501)).success).toBe(false);
  expect(statusNoteSchema.safeParse('bad\u0000note').success).toBe(false);
  expect(statusNoteSchema.parse(' nota ')).toBe('nota');
  const legacy = { ...base, history: undefined, allowedStatuses: undefined };
  expect(sellerOrderSchema.parse(legacy).allowedStatuses).toEqual([]);
  expect(
    sellerOrderSchema.safeParse({
      ...base,
      history: [{ ...base.history[0], createdAt: 'invalid' }],
    }).success,
  ).toBe(false);
});
it.each(['CUSTOMER', 'ADMIN'] as const)('rol %s no consulta pedidos de vendedor', async (role) => {
  useSession.setState({ user: { ...user, role } });
  open('/vendedor/pedidos');
  await screen.findByText('Esta sección es para vendedores');
  expect(reads).toHaveLength(0);
});
it('invitado vuelve al login desde detalle de vendedor', async () => {
  useSession.setState({ status: 'guest', user: null, token: null });
  open(sellerPath);
  await screen.findByRole('heading', { name: 'Ingresa a PatziShop' });
  expect(reads).toHaveLength(0);
});
it('lista y filtra con paginación y parámetros acotados', async () => {
  open('/vendedor/pedidos');
  await screen.findByRole('link', { name: 'Pedido #42 ↗' });
  fireEvent.change(screen.getByLabelText('Estado del pedido'), { target: { value: 'CONFIRMED' } });
  await waitFor(() =>
    expect(reads.at(-1)?.params).toMatchObject({ page: 1, status: 'CONFIRMED', limit: 12 }),
  );
  await userEvent.click(screen.getByRole('link', { name: 'Siguiente →' }));
  await waitFor(() => expect(reads.at(-1)?.params).toMatchObject({ page: 2, status: 'CONFIRMED' }));
  expect(writes).toHaveLength(0);
});
it('URL inválida no envía consultas privadas', async () => {
  open('/vendedor/pedidos?status=INVALID');
  await screen.findByText('Revisa los filtros del enlace');
  expect(reads).toHaveLength(0);
});
it('detalle muestra snapshot e historial; solo ofrece próximos estados del servidor', async () => {
  open(sellerPath);
  await screen.findByText('Bolso histórico', { exact: false });
  expect(screen.getByText('Compra confirmada')).toBeTruthy();
  const select = screen.getByLabelText('Nuevo estado') as HTMLSelectElement;
  expect([...select.options].map((option) => option.value)).toEqual(['', 'PREPARING', 'CANCELLED']);
  expect(screen.queryByText('Total global')).toBeNull();
});
it('revisión no escribe; confirmar envía estado esperado y nota una sola vez', async () => {
  open(sellerPath);
  await screen.findByLabelText('Nuevo estado');
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'PREPARING' } });
  fireEvent.change(screen.getByLabelText('Nota visible al cliente y la tienda (opcional)'), {
    target: { value: '  Preparación ficticia  ' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Revisar cambio' }));
  expect(writes).toHaveLength(0);
  const button = screen.getByRole('button', { name: 'Confirmar cambio de estado' });
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByText('Preparación ficticia');
  expect(writes).toEqual([
    {
      url: `/seller/orders/${id}/status`,
      body: { expectedStatus: 'CONFIRMED', status: 'PREPARING', note: 'Preparación ficticia' },
    },
  ]);
  await screen.findByRole('option', { name: 'Enviado' });
});
it('cliente cancela su subpedido con segundo paso y obtiene total no cancelado del servidor', async () => {
  useSession.setState({ user: { ...user, role: 'CUSTOMER' } });
  open(`/pedidos/${orderId}`);
  await screen.findByRole('button', { name: 'Revisar cancelación' });
  await userEvent.click(screen.getByRole('button', { name: 'Revisar cancelación' }));
  expect(writes).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Revisar cancelación' })).toBeNull(),
  );
  expect(writes[0]).toEqual({
    url: `/orders/seller-orders/${id}/cancel`,
    body: { expectedStatus: 'CONFIRMED', note: '' },
  });
  expect(await screen.findByText(/Q\s*0\.00/u)).toBeTruthy();
  expect(screen.getByText(/no ejecuta cobros ni reembolsos/i)).toBeTruthy();
});
it('vendedor no modifica un estado final', async () => {
  part = { ...part, status: 'DELIVERED', allowedStatuses: [] };
  open(sellerPath);
  await screen.findByText('Entregado', { exact: true });
  expect(screen.queryByLabelText('Nuevo estado')).toBeNull();
  expect(writes).toHaveLength(0);
});
it('cliente consulta preparación sin acción para cancelar', async () => {
  part = { ...part, status: 'PREPARING', allowedStatuses: ['SHIPPED', 'CANCELLED'] };
  useSession.setState({ user: { ...user, role: 'CUSTOMER' } });
  open(`/pedidos/${orderId}`);
  await screen.findByText('En preparación', { exact: true });
  expect(screen.queryByRole('button', { name: 'Revisar cancelación' })).toBeNull();
  expect(writes).toHaveLength(0);
});
it('respuesta incierta obliga GET y fallo de consulta mantiene bloqueo sin repetir PATCH', async () => {
  const normal = api.defaults.adapter;
  let failRead = false;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') {
      writes.push({ url: config.url!, body: JSON.parse(config.data as string) });
      failRead = true;
      throw new AxiosError('Network', 'ERR_NETWORK', config);
    }
    if (failRead) throw failed(config, 503, 'UNAVAILABLE');
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open(sellerPath);
  await screen.findByLabelText('Nuevo estado');
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'PREPARING' } });
  await userEvent.click(screen.getByRole('button', { name: 'Revisar cambio' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio de estado' }));
  await screen.findByRole('button', { name: 'Consultar estado actual' });
  expect(writes).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Consultar estado actual' }));
  await screen.findByText('No pudimos consultar el pedido. Comprueba de nuevo antes de continuar.');
  expect(writes).toHaveLength(1);
  failRead = false;
  part = { ...part, status: 'PREPARING', allowedStatuses: ['SHIPPED', 'CANCELLED'] };
  await userEvent.click(screen.getByRole('button', { name: 'Consultar estado actual' }));
  await screen.findByRole('option', { name: 'Enviado' });
  expect(writes).toHaveLength(1);
});
it('conflicto de estado requiere nueva consulta y no aplica otra decisión automáticamente', async () => {
  const normal = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') {
      writes.push({ url: config.url!, body: {} });
      part = { ...part, status: 'SHIPPED', allowedStatuses: ['DELIVERED'] };
      throw failed(config, 409, 'ORDER_STATE_CHANGED');
    }
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open(sellerPath);
  await screen.findByLabelText('Nuevo estado');
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'PREPARING' } });
  await userEvent.click(screen.getByRole('button', { name: 'Revisar cambio' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio de estado' }));
  await screen.findByText('El pedido cambió. Vuelve a consultar su estado antes de continuar.');
  await userEvent.click(screen.getByRole('button', { name: 'Consultar estado actual' }));
  await screen.findByRole('option', { name: 'Entregado' });
  expect(writes).toHaveLength(1);
});
it('404 ajeno no muestra entrega ni habilita acciones', async () => {
  api.defaults.adapter = async (config) => {
    throw failed(config, 404, 'RESOURCE_NOT_FOUND');
  };
  open(sellerPath);
  await screen.findByText('Este subpedido no está disponible');
  expect(screen.queryByText('Cliente ficticio')).toBeNull();
  expect(screen.queryByLabelText('Nuevo estado')).toBeNull();
});
it('respuesta tras logout no muestra historial ni conserva caché privada', async () => {
  const normal = api.defaults.adapter;
  let finish: () => void = () => {};
  let started = false;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') {
      started = true;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return response(config, { ...part, status: 'PREPARING' });
    }
    return (normal as (c: InternalAxiosRequestConfig) => Promise<ReturnType<typeof response>>)(
      config,
    );
  };
  open(sellerPath);
  await screen.findByLabelText('Nuevo estado');
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'PREPARING' } });
  await userEvent.click(screen.getByRole('button', { name: 'Revisar cambio' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio de estado' }));
  await waitFor(() => expect(started).toBe(true));
  act(() => {
    useSession.setState((s) => ({ status: 'guest', user: null, token: null, epoch: s.epoch + 1 }));
    queryClient.clear();
  });
  await act(async () => finish());
  await screen.findByRole('heading', { name: 'Ingresa a PatziShop' });
  expect(screen.queryByText('Compra confirmada')).toBeNull();
  expect(queryClient.getQueriesData({ queryKey: ['seller-order'] })).toHaveLength(0);
});
