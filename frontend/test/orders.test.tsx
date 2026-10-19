import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { api, useSession } from '../src/services/session';
import { queryClient } from '../src/services/query-client';
import { orderSchema, pendingOrderKey, rememberOrderKey } from '../src/services/orders';
const user = {
  id: '52a2334c-bdce-40b3-ade7-b9200a46c7a6',
  name: 'Cliente prueba',
  email: 'customer@example.test',
  role: 'CUSTOMER' as const,
};
const delivery = {
  recipientName: 'Cliente prueba',
  phone: '55550000',
  addressLine: 'Dirección temporal de prueba',
  city: 'Patzicía',
  region: 'Chimaltenango',
  countryCode: 'GT',
  postalCode: '',
  deliveryInstructions: '',
};
const store = {
  id: '58948eaa-d5ec-45a2-b638-3e8696b7b65e',
  name: 'Tejidos Patzi',
  slug: 'tejidos-patzi',
  logo: null,
};
const product = {
  id: 'cd6da741-3475-4a38-91b9-1ca2430be6e7',
  name: 'Bolso histórico',
  slug: 'bolso',
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
  maxQuantity: 5,
  issue: null,
  lineTotal: '20.20',
};
const cart = {
  groups: [{ business: store, items: [item], subtotal: '20.20' }],
  itemCount: 1,
  quantityCount: 2,
  total: '20.20',
  subtotal: '20.20',
  hasIssues: false,
};
const option = {
  method: 'CASH_ON_DELIVERY',
  label: 'Pago contra entrega',
  description: 'Pagas al recibir.',
  simulation: false,
};
const options = {
  paymentMethods: [option],
  countryCode: 'GT',
  currency: 'GTQ',
  canPlaceOrder: true,
};
const preview = {
  stage: 'REVIEW_ONLY',
  canPlaceOrder: true,
  reviewVersion: 'a'.repeat(64),
  delivery,
  cart,
  payment: {
    ...option,
    status: 'PENDING',
    currency: 'GTQ',
    amount: '20.20',
    requiresOnlinePayment: false,
  },
  shippingTotal: null,
};
const receipt = {
  id: 'ca99de8c-50a8-4876-b698-72c4d4b761fc',
  number: 123,
  total: '20.20',
  currency: 'GTQ',
  paymentMethod: 'CASH_ON_DELIVERY',
  paymentStatus: 'PENDING',
  simulation: false,
  delivery,
  createdAt: '2026-10-18T12:00:00.000Z',
  sellerOrders: [
    {
      id: '76e5d381-4015-4689-a24e-091a451d0e74',
      business: store,
      subtotal: '20.20',
      status: 'CONFIRMED',
      items: [
        {
          id: item.id,
          productId: product.id,
          productName: product.name,
          unitPrice: '10.10',
          quantity: 2,
          lineTotal: '20.20',
        },
      ],
    },
  ],
};
function response(config: InternalAxiosRequestConfig, data: unknown) {
  return { config, data, status: 200, statusText: '', headers: new AxiosHeaders() };
}
function failed(config: InternalAxiosRequestConfig, status: number, error: string) {
  return new AxiosError('Test error', 'ERR_BAD_RESPONSE', config, undefined, {
    ...response(config, { error }),
    status,
  });
}
function open(path: string) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
async function review() {
  open('/checkout');
  await screen.findByLabelText('Teléfono de contacto');
  for (const [label, value] of [
    ['Teléfono de contacto', delivery.phone],
    ['Dirección de entrega', delivery.addressLine],
    ['Municipio o ciudad', delivery.city],
    ['Departamento', delivery.region],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  await userEvent.click(screen.getByRole('button', { name: 'Revisar entrega' }));
  await screen.findByRole('button', { name: /Confirmar pedido/ });
}
beforeEach(() => {
  sessionStorage.clear();
  queryClient.clear();
  useSession.setState((state) => ({
    user,
    token: 'orders-test',
    status: 'authenticated',
    epoch: state.epoch + 1,
  }));
  api.defaults.adapter = async (config) =>
    response(
      config,
      config.url === '/cart'
        ? cart
        : config.url === '/checkout/options'
          ? options
          : config.url === '/checkout/preview'
            ? preview
            : receipt,
    );
});
it('error al recuperar mantiene el intento y solo permite comprobar de nuevo', async () => {
  const key = '02390e7d-f54b-4bac-ae72-ef11712c3029';
  rememberOrderKey(user.id, key);
  let offline = true;
  const writes = vi.fn();
  api.defaults.adapter = async (config) => {
    if (config.method === 'post') writes();
    if (offline) throw failed(config, 503, 'TEST');
    return response(config, receipt);
  };
  open('/checkout');
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('comprobar el resultado'),
  );
  expect(screen.queryByRole('button', { name: 'Volver a revisar mi entrega' })).toBeNull();
  expect(pendingOrderKey(user.id)).toBe(key);
  offline = false;
  await userEvent.click(screen.getByRole('button', { name: 'Comprobar de nuevo' }));
  expect(await screen.findByRole('heading', { name: 'Pedido #123' })).toBeTruthy();
  expect(writes).not.toHaveBeenCalled();
});
it('recibo usa snapshots, estados por tienda e importes textuales sin cargar catálogo', async () => {
  const calls: string[] = [];
  api.defaults.adapter = async (config) => {
    calls.push(config.url ?? '');
    return response(config, receipt);
  };
  open(`/pedidos/${receipt.id}`);
  expect(await screen.findByRole('heading', { name: 'Pedido #123' })).toBeTruthy();
  expect(screen.getByText('Tejidos Patzi')).toBeTruthy();
  expect(screen.getByText('Confirmado')).toBeTruthy();
  expect(screen.getByText('Contra entrega · Pendiente')).toBeTruthy();
  expect(calls).toEqual([`/orders/${receipt.id}`]);
  expect(orderSchema.safeParse({ ...receipt, total: 20.2 }).success).toBe(false);
});
it('recibo simulado anuncia prueba sin dinero real y muestra subpedidos separados', async () => {
  const second = {
    ...receipt.sellerOrders[0]!,
    id: 'f73a001f-f3cf-4102-b0ef-cb4d0590c129',
    business: { ...store, name: 'Taller de prueba' },
  };
  api.defaults.adapter = async (config) =>
    response(config, {
      ...receipt,
      paymentMethod: 'SIMULATED',
      paymentStatus: 'PAID',
      simulation: true,
      sellerOrders: [...receipt.sellerOrders, second],
    });
  open(`/pedidos/${receipt.id}`);
  expect(await screen.findByText('Pago simulado de prueba. No se cobró dinero real.')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Taller de prueba' })).toBeTruthy();
});
it('historial pagina y enlaza recibos sin escribir pedidos', async () => {
  const calls = vi.fn();
  api.defaults.adapter = async (config) => {
    calls(config.method, config.params);
    return response(config, {
      data: [receipt],
      meta: { page: Number(config.params.page), limit: 12, total: 13, totalPages: 2 },
    });
  };
  open('/pedidos');
  expect(await screen.findByRole('link', { name: 'Pedido #123 ↗' })).toHaveProperty(
    'href',
    expect.stringContaining(receipt.id),
  );
  await userEvent.click(screen.getByRole('link', { name: 'Siguiente →' }));
  await waitFor(() => expect(calls).toHaveBeenCalledWith('get', { page: 2, limit: 12 }));
});
it('invitados y vendedores no obtienen pedidos privados del cliente', async () => {
  const calls = vi.fn();
  api.defaults.adapter = async (config) => {
    calls();
    return response(config, receipt);
  };
  useSession.setState({ user: { ...user, role: 'SELLER' } });
  open('/pedidos');
  expect(
    await screen.findByRole('heading', { name: 'Estos pedidos son para clientes' }),
  ).toBeTruthy();
  expect(calls).not.toHaveBeenCalled();
});
it('recibo ajeno/no existente tiene recuperación sin mostrar la entrega', async () => {
  api.defaults.adapter = async (config) => {
    throw failed(config, 404, 'RESOURCE_NOT_FOUND');
  };
  open(`/pedidos/${receipt.id}`);
  expect(await screen.findByText('Este pedido no está disponible')).toBeTruthy();
  expect(screen.queryByText(delivery.addressLine)).toBeNull();
});
it('confirmación envía versión y UUID, bloquea doble clic y navega al recibo', async () => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: Record<string, unknown>[] = [];
  api.defaults.adapter = async (config) => {
    if (config.url === '/orders' && config.method === 'post') {
      writes.push(JSON.parse(config.data as string));
      await waiting;
      return response(config, receipt);
    }
    return response(
      config,
      config.url === '/cart'
        ? cart
        : config.url === '/checkout/options'
          ? options
          : config.url === '/checkout/preview'
            ? preview
            : receipt,
    );
  };
  await review();
  const button = screen.getByRole('button', { name: /Confirmar pedido/ });
  await userEvent.dblClick(button);
  expect(screen.getByRole('button', { name: 'Confirmando pedido…' })).toHaveProperty(
    'disabled',
    true,
  );
  expect(writes).toHaveLength(1);
  expect(writes[0]).toEqual({
    delivery,
    paymentMethod: 'CASH_ON_DELIVERY',
    reviewVersion: preview.reviewVersion,
    idempotencyKey: expect.stringMatching(/^[a-f0-9-]{36}$/u),
  });
  expect(pendingOrderKey(user.id)).toBe(writes[0]!.idempotencyKey);
  await act(async () => release());
  expect(await screen.findByRole('heading', { name: 'Pedido #123' })).toBeTruthy();
  expect(pendingOrderKey(user.id)).toBeNull();
});
it('respuesta perdida recupera el mismo intento con GET y no repite la compra', async () => {
  const writes = vi.fn();
  let body: { idempotencyKey: string } | undefined;
  api.defaults.adapter = async (config) => {
    if (config.url === '/orders' && config.method === 'post') {
      writes();
      body = JSON.parse(config.data as string);
      throw new AxiosError('Lost response', 'ERR_NETWORK', config);
    }
    if (config.url?.includes('/orders/confirmation/'))
      expect(config.url).toBe(`/orders/confirmation/${body!.idempotencyKey}`);
    return response(
      config,
      config.url === '/cart'
        ? cart
        : config.url === '/checkout/options'
          ? options
          : config.url === '/checkout/preview'
            ? preview
            : receipt,
    );
  };
  await review();
  await userEvent.click(screen.getByRole('button', { name: /Confirmar pedido/ }));
  expect(await screen.findByRole('heading', { name: 'Pedido #123' })).toBeTruthy();
  expect(writes).toHaveBeenCalledOnce();
});
it('al recargar, UUID pendiente permite recuperar sin guardar dirección ni reenviar POST', async () => {
  const key = '02390e7d-f54b-4bac-ae72-ef11712c3029';
  rememberOrderKey(user.id, key);
  const calls = vi.fn();
  api.defaults.adapter = async (config) => {
    calls(config.method, config.url);
    return response(config, receipt);
  };
  open('/checkout');
  expect(await screen.findByRole('heading', { name: 'Pedido #123' })).toBeTruthy();
  expect(calls).toHaveBeenCalledWith('get', `/orders/confirmation/${key}`);
  expect(calls).not.toHaveBeenCalledWith('post', expect.anything());
  expect(JSON.stringify(sessionStorage)).not.toContain(delivery.addressLine);
});
it('intento ausente permite volver a revisar y error de recuperación no habilita compra nueva', async () => {
  const key = '02390e7d-f54b-4bac-ae72-ef11712c3029';
  rememberOrderKey(user.id, key);
  api.defaults.adapter = async (config) => {
    if (config.url?.includes('/orders/confirmation/'))
      throw failed(config, 404, 'RESOURCE_NOT_FOUND');
    return response(config, config.url === '/cart' ? cart : options);
  };
  open('/checkout');
  await userEvent.click(await screen.findByRole('button', { name: 'Volver a revisar mi entrega' }));
  expect(await screen.findByLabelText('Dirección de entrega')).toHaveProperty('value', '');
  expect(pendingOrderKey(user.id)).toBeNull();
});
it('conflicto de versión exige revisión nueva y no reintenta automáticamente', async () => {
  const writes = vi.fn();
  api.defaults.adapter = async (config) => {
    if (config.url === '/orders' && config.method === 'post') {
      writes();
      throw failed(config, 409, 'CHECKOUT_CHANGED');
    }
    return response(
      config,
      config.url === '/cart' ? cart : config.url === '/checkout/options' ? options : preview,
    );
  };
  await review();
  await userEvent.click(screen.getByRole('button', { name: /Confirmar pedido/ }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('Revisa de nuevo'),
  );
  expect(screen.queryByRole('button', { name: /Confirmar pedido/ })).toBeNull();
  expect(writes).toHaveBeenCalledOnce();
  expect(pendingOrderKey(user.id)).toBeNull();
});
it('respuesta de compra tras logout no abre recibo ni muestra datos de entrega', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  api.defaults.adapter = async (config) => {
    if (config.url === '/orders' && config.method === 'post') {
      await pending;
      return response(config, receipt);
    }
    return response(
      config,
      config.url === '/cart' ? cart : config.url === '/checkout/options' ? options : preview,
    );
  };
  await review();
  await userEvent.click(screen.getByRole('button', { name: /Confirmar pedido/ }));
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
  expect(screen.queryByRole('heading', { name: 'Pedido #123' })).toBeNull();
});
