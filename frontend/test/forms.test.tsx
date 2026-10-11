import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { AppRoutes } from '../src/routes/AppRoutes';
import { api, authTransport, useSession } from '../src/services/session';
import { queryClient } from '../src/services/query-client';
const user = {
  id: '0d3cc16c-b532-4b84-a951-9d8295c170b2',
  name: 'María Test',
  email: 'maria@example.test',
  role: 'SELLER' as const,
};
const shop = {
  id: 'c48f351f-0313-4c3a-93e3-6fa7bda80774',
  ownerId: user.id,
  name: 'Tejidos Patzi',
  slug: 'tejidos-patzi',
  description: 'Tejidos locales',
  email: user.email,
  phone: '+502 5555-0000',
  address: 'Zona 1, Patzicía',
  logo: null,
  banner: null,
  status: 'PENDING',
  createdAt: '2026-10-11T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
};
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, status, statusText: '', headers: new AxiosHeaders() };
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
beforeEach(() => {
  queryClient.clear();
  useSession.setState((state) => ({
    status: 'guest',
    user: null,
    token: null,
    epoch: state.epoch + 1,
  }));
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: vi.fn((_name: string, callback: () => Promise<unknown>) => callback()) },
  });
});
it('una ruta privada anónima dirige al login y un cliente no entra a tienda', () => {
  open('/cuenta');
  expect(screen.getByRole('heading', { name: 'Ingresa a PatziShop' })).toBeTruthy();
});
it('el acceso a tienda comprueba el rol', () => {
  useSession.setState({
    status: 'authenticated',
    token: 'test',
    user: { ...user, role: 'CUSTOMER' },
  });
  open('/cuenta/tienda');
  expect(screen.getByRole('heading', { name: 'Esta sección es para vendedores' })).toBeTruthy();
});
it('valida registro sin enviar solicitudes y preselecciona vendedor desde la ruta', async () => {
  const adapter = vi.fn();
  authTransport.defaults.adapter = adapter;
  open('/registro?tipo=vendedor');
  expect((screen.getByRole('radio', { name: 'Vendedor' }) as HTMLInputElement).checked).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(await screen.findByText('Escribe tu nombre.')).toBeTruthy();
  expect(adapter).not.toHaveBeenCalled();
});
it('registra vendedor sin enviar confirmación ni rol administrativo', async () => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
    response(config, {
      success: true,
      tokenType: 'Bearer',
      expiresIn: 900,
      accessToken: 'test',
      user,
    }),
  );
  authTransport.defaults.adapter = adapter;
  api.defaults.adapter = async (config) => {
    throw new AxiosError(
      'Not found',
      'ERR_BAD_REQUEST',
      config,
      undefined,
      response(config, {}, 404),
    );
  };
  open('/registro?tipo=vendedor');
  await userEvent.type(screen.getByLabelText('Nombre completo'), 'María Test');
  await userEvent.type(screen.getByLabelText('Correo electrónico'), user.email);
  await userEvent.type(screen.getByLabelText('Contraseña', { exact: true }), 'una-clave-muy-larga');
  await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'una-clave-muy-larga');
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(await screen.findByRole('heading', { name: 'Presenta tu tienda' })).toBeTruthy();
  const data = JSON.parse(adapter.mock.calls[0]![0].data as string) as Record<string, string>;
  expect(data.role).toBe('SELLER');
  expect(data.confirmPassword).toBeUndefined();
});
it('muestra un error de login seguro y el formulario queda disponible', async () => {
  authTransport.defaults.adapter = async (config) => {
    throw new AxiosError(
      'Invalid',
      'ERR_BAD_REQUEST',
      config,
      undefined,
      response(config, { password: 'never-display' }, 401),
    );
  };
  open('/ingresar');
  await userEvent.type(screen.getByLabelText('Correo electrónico'), user.email);
  await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrect-password');
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'El correo o la contraseña no son válidos, o la sesión ha vencido.',
  );
  expect(screen.queryByText('never-display')).toBeNull();
  expect((screen.getByRole('button', { name: 'Ingresar' }) as HTMLButtonElement).disabled).toBe(
    false,
  );
});
it('crea la tienda ausente y el siguiente guardado actualiza la tienda propia', async () => {
  useSession.setState({ status: 'authenticated', token: 'test', user });
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    if (config.method === 'get')
      throw new AxiosError(
        'Not found',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        response(config, {}, 404),
      );
    return response(config, shop, config.method === 'post' ? 201 : 200);
  });
  api.defaults.adapter = adapter;
  open('/cuenta/tienda');
  await screen.findByRole('heading', { name: 'Presenta tu tienda' });
  await userEvent.type(screen.getByLabelText('Nombre de la tienda'), shop.name);
  await userEvent.type(screen.getByLabelText('Identificador de la tienda'), shop.slug);
  await userEvent.type(screen.getByLabelText('Teléfono'), shop.phone);
  await userEvent.type(screen.getByLabelText('Dirección'), shop.address);
  await userEvent.click(screen.getByRole('button', { name: 'Crear mi tienda' }));
  expect(await screen.findByText('Los datos de tu tienda se guardaron.')).toBeTruthy();
  expect(screen.getByText('En revisión')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(adapter.mock.calls.map(([config]) => config.method)).toEqual(['get', 'post', 'patch']),
  );
  const body = JSON.parse(adapter.mock.calls[1]![0].data as string) as Record<string, unknown>;
  expect(body.logo).toBeNull();
  expect(body.ownerId).toBeUndefined();
  expect(body.status).toBeUndefined();
});
it('una caída de API no se confunde con una tienda nueva', async () => {
  useSession.setState({ status: 'authenticated', token: 'test', user });
  api.defaults.adapter = async () => {
    throw new Error('offline');
  };
  open('/cuenta/tienda');
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Crear mi tienda' })).toBeNull();
});
