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
  adminBusinessSchema,
  adminDashboardSchema,
  readAdminFilters,
  type AdminBusiness,
} from '../src/services/admin';
const user = {
  id: '52a2334c-bdce-40b3-ade7-b9200a46c7a6',
  name: 'Administradora ficticia',
  email: 'admin@example.test',
  role: 'ADMIN' as const,
};
const id = '76e5d381-4015-4689-a24e-091a451d0e74';
const base = {
  id,
  ownerId: 'ca99de8c-50a8-4876-b698-72c4d4b761fc',
  name: 'Tejidos ficticios',
  slug: 'tejidos-prueba',
  description: 'Tienda local para pruebas',
  email: 'negocio@example.test',
  phone: '55550000',
  address: 'Dirección ficticia',
  logo: null,
  banner: null,
  status: 'PENDING',
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
  owner: { name: 'Vendedora ficticia', role: 'SELLER', isActive: true },
  allowedStatuses: ['ACTIVE', 'REJECTED'],
};
const summary = {
  users: { total: 5, active: 4, admins: 1, sellers: 2, customers: 2 },
  businesses: { total: 2, pending: 1, active: 1, suspended: 0, rejected: 0 },
  products: { total: 5, published: 2 },
  orders: {
    total: 2,
    sellerOrders: 4,
    open: 1,
    delivered: 2,
    cancelled: 1,
    cashOnDeliveryTotal: '25.50',
    simulatedTotal: '10.10',
    currency: 'GTQ',
  },
};
let row: AdminBusiness;
let reads: { url: string; params: unknown }[];
let writes: Record<string, unknown>[];
function response(config: InternalAxiosRequestConfig, data: unknown) {
  return { config, data, status: 200, statusText: '', headers: new AxiosHeaders() };
}
function fail(config: InternalAxiosRequestConfig, status = 409) {
  return new AxiosError('Fixture', 'ERR_BAD_RESPONSE', config, undefined, {
    ...response(config, { message: 'La tienda cambió', error: 'BUSINESS_CHANGED' }),
    status,
  });
}
function open(path = '/admin/dashboard') {
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
  row = adminBusinessSchema.parse(structuredClone(base));
  reads = [];
  writes = [];
  api.defaults.adapter = async (config) => {
    const url = config.url ?? '';
    if (config.method === 'patch') {
      const body = JSON.parse(config.data as string) as Record<string, unknown>;
      writes.push(body);
      row = {
        ...row,
        status: body.status as AdminBusiness['status'],
        updatedAt: '2026-10-23T12:01:00.000Z',
        allowedStatuses: ['SUSPENDED'],
      };
      return response(config, row);
    }
    reads.push({ url, params: config.params });
    if (url === '/admin/dashboard') return response(config, summary);
    if (url === '/admin/businesses')
      return response(config, {
        data: [row],
        meta: { page: config.params.page, limit: 12, total: 13, totalPages: 2 },
      });
    if (url === `/admin/businesses/${id}`) return response(config, row);
    throw new Error(`Unexpected ${url}`);
  };
});
it('contratos rechazan importes numéricos y filtros repetidos o inválidos', () => {
  expect(
    adminDashboardSchema.safeParse({
      ...summary,
      orders: { ...summary.orders, cashOnDeliveryTotal: 25.5 },
    }).success,
  ).toBe(false);
  for (const query of [
    'page=0',
    'page=10001',
    'status=OTHER',
    'status=ACTIVE&status=PENDING',
    'search=x&search=y',
  ])
    expect(() => readAdminFilters(new URLSearchParams(query))).toThrow();
});
it.each(['CUSTOMER', 'SELLER'] as const)('rol %s no consulta administración', async (role) => {
  useSession.setState({ user: { ...user, role } });
  open('/admin/negocios');
  expect(
    await screen.findByRole('heading', { name: 'Esta sección es para administradores' }),
  ).toBeTruthy();
  expect(reads).toHaveLength(0);
});
it('invitado vuelve al login desde revisión', async () => {
  useSession.setState({ status: 'guest', user: null, token: null });
  open(`/admin/negocios/${id}`);
  expect(await screen.findByRole('heading', { name: 'Ingresa a PatziShop' })).toBeTruthy();
  expect(reads).toHaveLength(0);
});
it('resumen distingue compras, subpedidos, publicados y dinero de prueba', async () => {
  open();
  expect(await screen.findByRole('heading', { name: 'Importe simulado' })).toBeTruthy();
  expect(screen.getByText(/Q\s*25\.50/u)).toBeTruthy();
  expect(screen.getByText(/Q\s*10\.10/u)).toBeTruthy();
  expect(screen.getByText('Productos publicados')).toBeTruthy();
  expect(screen.getByText(/No equivale a dinero cobrado/u)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Administración' }).getAttribute('href')).toBe(
    '/admin/dashboard',
  );
});
it('listado conserva filtro, búsqueda y paginación en consultas acotadas', async () => {
  open('/admin/negocios?status=PENDING&search=tejidos');
  await screen.findByRole('link', { name: 'Tejidos ficticios ↗' });
  expect(reads[0]?.params).toEqual({ page: 1, limit: 12, status: 'PENDING', search: 'tejidos' });
  await userEvent.click(screen.getByRole('link', { name: 'Siguiente →' }));
  await waitFor(() =>
    expect(reads.at(-1)?.params).toEqual({
      page: 2,
      limit: 12,
      status: 'PENDING',
      search: 'tejidos',
    }),
  );
  await userEvent.selectOptions(screen.getByLabelText('Estado de la tienda'), 'REJECTED');
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() =>
    expect(reads.at(-1)?.params).toEqual({
      page: 1,
      limit: 12,
      status: 'REJECTED',
      search: 'tejidos',
    }),
  );
});
it('enlace inválido no envía consultas', async () => {
  open('/admin/negocios?status=NO');
  expect(
    await screen.findByRole('heading', { name: 'Revisa los filtros del enlace' }),
  ).toBeTruthy();
  expect(reads).toHaveLength(0);
});
it('revisa datos y capacidades; confirmar envía versión una vez con doble clic', async () => {
  open(`/admin/negocios/${id}`);
  await screen.findByRole('heading', { name: 'Tejidos ficticios' });
  expect(screen.getByText('Vendedora ficticia')).toBeTruthy();
  expect(screen.queryByRole('option', { name: 'Suspender tienda' })).toBeNull();
  await userEvent.selectOptions(screen.getByLabelText('Próximo estado'), 'ACTIVE');
  await userEvent.click(screen.getByRole('button', { name: 'Revisar decisión' }));
  expect(writes).toHaveLength(0);
  const button = screen.getByRole('button', { name: 'Confirmar decisión' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toEqual({
    status: 'ACTIVE',
    expectedStatus: 'PENDING',
    expectedUpdatedAt: base.updatedAt,
  });
  await screen.findByRole('option', { name: 'Suspender tienda' });
});
it('propietario no elegible no ofrece aprobación', async () => {
  row = { ...row, owner: { ...row.owner, isActive: false }, allowedStatuses: ['REJECTED'] };
  open(`/admin/negocios/${id}`);
  await screen.findByRole('heading', { name: 'Tejidos ficticios' });
  expect(screen.queryByRole('option', { name: 'Aprobar tienda' })).toBeNull();
  expect(screen.getByText(/La aprobación no está disponible/u)).toBeTruthy();
});
it('conflicto requiere consultar y no vuelve a enviar la decisión automáticamente', async () => {
  const adapter = api.defaults.adapter as (
    config: InternalAxiosRequestConfig,
  ) => Promise<ReturnType<typeof response>>;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') throw fail(config);
    return adapter(config);
  };
  open(`/admin/negocios/${id}`);
  await screen.findByRole('heading', { name: 'Tejidos ficticios' });
  await userEvent.selectOptions(screen.getByLabelText('Próximo estado'), 'ACTIVE');
  await userEvent.click(screen.getByRole('button', { name: 'Revisar decisión' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar decisión' }));
  expect(await screen.findByRole('button', { name: 'Consultar estado actual' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Confirmar decisión' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Consultar estado actual' }));
  expect(await screen.findByRole('button', { name: 'Revisar decisión' })).toBeTruthy();
  expect(writes).toHaveLength(0);
});
it('respuesta incierta y GET fallido conservan bloqueo y datos consultados', async () => {
  const adapter = api.defaults.adapter as (
    config: InternalAxiosRequestConfig,
  ) => Promise<ReturnType<typeof response>>;
  let sent = false;
  let patchCount = 0;
  api.defaults.adapter = async (config) => {
    if (config.method === 'patch') {
      sent = true;
      patchCount++;
      throw new AxiosError('Network');
    }
    if (sent) throw fail(config, 503);
    return adapter(config);
  };
  open(`/admin/negocios/${id}`);
  await screen.findByRole('heading', { name: 'Tejidos ficticios' });
  await userEvent.selectOptions(screen.getByLabelText('Próximo estado'), 'ACTIVE');
  await userEvent.click(screen.getByRole('button', { name: 'Revisar decisión' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar decisión' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Consultar estado actual' }));
  expect(
    await screen.findByText('No se pudo consultar la tienda. Intenta consultar de nuevo.'),
  ).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Tejidos ficticios' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Confirmar decisión' })).toBeNull();
  expect(patchCount).toBe(1);
});
it('404 no muestra datos ni habilita decisión', async () => {
  api.defaults.adapter = async (config) => {
    throw fail(config, 404);
  };
  open(`/admin/negocios/${id}`);
  await screen.findByText(/Esta tienda no está disponible/u);
  expect(screen.queryByText('Dirección ficticia')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Revisar decisión' })).toBeNull();
});
it('respuesta tras cerrar sesión no reaparece ni conserva datos privados', async () => {
  let finish: ((value: ReturnType<typeof response>) => void) | undefined;
  api.defaults.adapter = (config) =>
    new Promise((resolve) => {
      finish = (data) => resolve({ ...data, config });
    });
  open(`/admin/negocios/${id}`);
  await waitFor(() => expect(finish).toBeDefined());
  await act(async () => {
    useSession.setState((s) => ({
      status: 'guest',
      user: null,
      token: null,
      epoch: s.epoch + 1,
    }));
    queryClient.clear();
  });
  await act(async () => {
    finish?.(response({} as InternalAxiosRequestConfig, row));
  });
  expect(await screen.findByRole('heading', { name: 'Ingresa a PatziShop' })).toBeTruthy();
  expect(screen.queryByText('Dirección ficticia')).toBeNull();
});
