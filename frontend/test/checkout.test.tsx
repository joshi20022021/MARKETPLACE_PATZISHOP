import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes } from '../src/routes/AppRoutes';
import { api, useSession } from '../src/services/session';
import { queryClient } from '../src/services/query-client';
import { checkoutInputSchema, checkoutPreviewSchema } from '../src/services/checkout';
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
const empty = {
  groups: [],
  itemCount: 0,
  quantityCount: 0,
  total: '0.00',
  subtotal: '0.00',
  hasIssues: false,
};
const delivery = {
  recipientName: 'Cliente prueba',
  phone: '+502 5555-0000',
  addressLine: 'Zona de prueba 1',
  city: 'Patzicía',
  region: 'Chimaltenango',
  countryCode: 'GT',
  postalCode: '',
  deliveryInstructions: '',
};
const methods = [
  {
    method: 'CASH_ON_DELIVERY',
    label: 'Pago contra entrega',
    description: 'Pagas al recibir.',
    simulation: false,
  },
  {
    method: 'SIMULATED',
    label: 'Pago simulado (prueba)',
    description: 'No se cobra dinero.',
    simulation: true,
  },
];
const options = {
  paymentMethods: methods,
  countryCode: 'GT',
  currency: 'GTQ',
  canPlaceOrder: false,
};
const preview = {
  stage: 'REVIEW_ONLY',
  canPlaceOrder: false,
  delivery,
  cart,
  payment: {
    ...methods[0],
    status: 'PENDING',
    currency: 'GTQ',
    amount: '20.20',
    requiresOnlinePayment: false,
  },
  shippingTotal: null,
};
function response(config: InternalAxiosRequestConfig, data: unknown) {
  return { config, data, status: 200, statusText: '', headers: new AxiosHeaders() };
}
function error(config: InternalAxiosRequestConfig, code: string, status = 409) {
  return new AxiosError('Test error', 'ERR_BAD_RESPONSE', config, undefined, {
    ...response(config, { error: code }),
    status,
  });
}
function open(path = '/checkout', from?: string) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: path, state: from ? { from } : null }]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
async function fill() {
  await screen.findByLabelText('Teléfono de contacto');
  for (const [label, value] of [
    ['Teléfono de contacto', delivery.phone],
    ['Dirección de entrega', delivery.addressLine],
    ['Municipio o ciudad', delivery.city],
    ['Departamento', delivery.region],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
}
beforeEach(() => {
  queryClient.clear();
  useSession.setState((state) => ({
    user,
    token: 'checkout-test',
    status: 'authenticated',
    epoch: state.epoch + 1,
  }));
  api.defaults.adapter = async (config) =>
    response(
      config,
      config.url === '/checkout/options'
        ? options
        : config.url === '/checkout/preview'
          ? preview
          : cart,
    );
});
it('contrato valida dirección y rechaza cobro, compra o totales inconsistentes en respuestas', () => {
  expect(
    checkoutInputSchema.parse({
      delivery: { ...delivery, recipientName: ' Cliente prueba ' },
      paymentMethod: 'SIMULATED',
    }).delivery.recipientName,
  ).toBe('Cliente prueba');
  for (const extra of [
    { recipientName: ' ' },
    { phone: 'invalid' },
    { city: 'a' },
    { countryCode: 'US' },
    { addressLine: 'x'.repeat(501) },
    { deliveryInstructions: 'x'.repeat(1001) },
  ])
    expect(
      checkoutInputSchema.safeParse({
        delivery: { ...delivery, ...extra },
        paymentMethod: 'SIMULATED',
      }).success,
    ).toBe(false);
  expect(checkoutPreviewSchema.safeParse(preview).success).toBe(true);
  for (const value of [
    { ...preview, canPlaceOrder: true },
    { ...preview, payment: { ...preview.payment, status: 'PAID' } },
    { ...preview, payment: { ...preview.payment, amount: '0.01' } },
    { ...preview, cart: empty },
  ])
    expect(checkoutPreviewSchema.safeParse(value).success).toBe(false);
});
it('invitado va a login sin consultar checkout', async () => {
  const calls = vi.fn();
  api.defaults.adapter = async (config) => {
    calls();
    return response(config, options);
  };
  useSession.setState({ status: 'guest', user: null, token: null });
  open();
  expect(await screen.findByRole('heading', { name: 'Ingresa a PatziShop' })).toBeTruthy();
  expect(calls).not.toHaveBeenCalled();
});
it('rol SELLER no obtiene opciones ni carrito del checkout', async () => {
  const calls = vi.fn();
  api.defaults.adapter = async (config) => {
    calls();
    return response(config, options);
  };
  useSession.setState({ user: { ...user, role: 'SELLER' } });
  open();
  expect(await screen.findByRole('heading', { name: 'El checkout es para clientes' })).toBeTruthy();
  expect(calls).not.toHaveBeenCalled();
});
it('login conserva retorno interno al checkout', async () => {
  open('/ingresar', '/checkout');
  expect(await screen.findByRole('heading', { name: 'Prepara tu entrega.' })).toBeTruthy();
});
it('carrito vacío o con incidencias no muestra formulario de entrega', async () => {
  api.defaults.adapter = async (config) =>
    response(config, config.url === '/cart' ? empty : options);
  open();
  expect(await screen.findByRole('heading', { name: 'Tu carrito está vacío' })).toBeTruthy();
  expect(screen.queryByLabelText('Dirección de entrega')).toBeNull();
});
it('incidencias de disponibilidad conducen a revisar el carrito', async () => {
  api.defaults.adapter = async (config) =>
    response(config, config.url === '/cart' ? { ...cart, hasIssues: true } : options);
  open();
  expect(await screen.findByRole('link', { name: 'Revisar mi carrito' })).toHaveProperty(
    'href',
    expect.stringContaining('/carrito'),
  );
  expect(screen.queryByRole('button', { name: 'Revisar entrega' })).toBeNull();
});
it('carrito válido enlaza al checkout y cantidades inválidas no lo habilitan', async () => {
  open('/carrito');
  expect(await screen.findByRole('link', { name: 'Preparar entrega ↗' })).toHaveProperty(
    'href',
    expect.stringContaining('/checkout'),
  );
});
it('errores de campos no envían datos incompletos al servidor', async () => {
  const writes = vi.fn();
  api.defaults.adapter = async (config) => {
    if (config.method === 'post') writes();
    return response(config, config.url === '/cart' ? cart : options);
  };
  open();
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar entrega' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Teléfono de contacto').getAttribute('aria-invalid')).toBe('true'),
  );
  expect(writes).not.toHaveBeenCalled();
});
it('envía dirección y método sin importes, revisa ambos métodos y retira resumen al editar', async () => {
  const writes: unknown[] = [];
  api.defaults.adapter = async (config) => {
    if (config.method === 'post') {
      const body = JSON.parse(config.data as string) as {
        delivery: typeof delivery;
        paymentMethod: string;
      };
      writes.push(body);
      return response(config, {
        ...preview,
        delivery: body.delivery,
        payment: {
          ...preview.payment,
          ...methods.find((value) => value.method === body.paymentMethod),
        },
      });
    }
    return response(config, config.url === '/cart' ? cart : options);
  };
  open();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: 'Revisar entrega' }));
  const heading = await screen.findByRole('heading', { name: 'Revisión de entrega' });
  expect(document.activeElement).toBe(heading);
  expect(writes[0]).toEqual({ delivery, paymentMethod: 'CASH_ON_DELIVERY' });
  expect(screen.queryByRole('button', { name: /confirmar|pagar ahora/i })).toBeNull();
  await userEvent.click(screen.getByRole('radio', { name: /Pago simulado/ }));
  expect(screen.queryByRole('heading', { name: 'Revisión de entrega' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Revisar entrega' }));
  expect(await screen.findByRole('heading', { name: 'Revisión de entrega' })).toBeTruthy();
  expect(writes[1]).toEqual({ delivery, paymentMethod: 'SIMULATED' });
  fireEvent.change(screen.getByLabelText('Dirección de entrega'), {
    target: { value: 'Otra dirección de prueba' },
  });
  expect(screen.queryByRole('heading', { name: 'Revisión de entrega' })).toBeNull();
});
it('revisión reemplaza precios con el cálculo actual y se oculta si cambia el carrito', async () => {
  const updated = {
    ...cart,
    total: '24.70',
    subtotal: '24.70',
    groups: [
      {
        business: store,
        subtotal: '24.70',
        items: [{ ...item, product: { ...product, price: '12.35' }, lineTotal: '24.70' }],
      },
    ],
  };
  api.defaults.adapter = async (config) =>
    response(
      config,
      config.url === '/checkout/preview'
        ? { ...preview, cart: updated, payment: { ...preview.payment, amount: '24.70' } }
        : config.url === '/cart'
          ? cart
          : options,
    );
  open();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: 'Revisar entrega' }));
  await screen.findByRole('heading', { name: 'Revisión de entrega' });
  expect(queryClient.getQueryData(['cart', user.id, useSession.getState().epoch])).toEqual(updated);
  act(() =>
    queryClient.setQueryData(['cart', user.id, useSession.getState().epoch], {
      ...updated,
      total: '25.00',
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Revisión de entrega' })).toBeNull(),
  );
});
it('conflicto retira revisión y actualiza disponibilidad sin repetir el POST', async () => {
  let changed = false;
  const writes = vi.fn();
  api.defaults.adapter = async (config) => {
    if (config.method === 'post') {
      writes();
      changed = true;
      throw error(config, 'CART_NEEDS_ATTENTION');
    }
    return response(config, config.url === '/cart' ? { ...cart, hasIssues: changed } : options);
  };
  open();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: 'Revisar entrega' }));
  expect(await screen.findByRole('heading', { name: 'Tu carrito necesita atención' })).toBeTruthy();
  expect(writes).toHaveBeenCalledOnce();
});
it('fallo de opciones tiene reintento y no se interpreta como carrito vacío', async () => {
  let offline = true;
  api.defaults.adapter = async (config) => {
    if (offline && config.url === '/checkout/options') throw error(config, 'TEST', 503);
    return response(config, config.url === '/cart' ? cart : options);
  };
  open();
  expect(
    await screen.findByRole('heading', { name: 'No pudimos preparar tu entrega' }),
  ).toBeTruthy();
  offline = false;
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByLabelText('Dirección de entrega')).toBeTruthy();
});
it('error de red durante revisión conserva los campos y permite reintento explícito', async () => {
  api.defaults.adapter = async (config) => {
    if (config.method === 'post') throw new AxiosError('Offline', 'ERR_NETWORK', config);
    return response(config, config.url === '/cart' ? cart : options);
  };
  open();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: 'Revisar entrega' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('conectar'),
  );
  expect(screen.getByLabelText('Dirección de entrega')).toHaveProperty(
    'value',
    delivery.addressLine,
  );
});
it('doble envío se bloquea mientras se revisa y logout descarta respuesta y datos de entrega', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes = vi.fn();
  api.defaults.adapter = async (config) => {
    if (config.method === 'post') {
      writes();
      await pending;
      return response(config, preview);
    }
    return response(config, config.url === '/cart' ? cart : options);
  };
  open();
  await fill();
  await userEvent.click(screen.getByRole('button', { name: 'Revisar entrega' }));
  expect(screen.getByRole('button', { name: 'Revisando…' })).toHaveProperty('disabled', true);
  expect(writes).toHaveBeenCalledOnce();
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
  expect(screen.queryByRole('heading', { name: 'Revisión de entrega' })).toBeNull();
  expect(
    JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.state.data),
    ),
  ).not.toContain(delivery.addressLine);
});
