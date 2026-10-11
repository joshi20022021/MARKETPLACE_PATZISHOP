import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  api,
  authTransport,
  authenticate,
  logout,
  refreshSession,
  useSession,
} from '../src/services/session';
import { queryClient } from '../src/services/query-client';
const user = {
  id: '0d3cc16c-b532-4b84-a951-9d8295c170b2',
  name: 'Cliente de prueba',
  email: 'test@example.test',
  role: 'CUSTOMER' as const,
};
const grant = {
  success: true,
  tokenType: 'Bearer',
  expiresIn: 900,
  accessToken: 'new-token',
  user,
};
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, status, statusText: '', headers: new AxiosHeaders() };
}
function reject(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    response(config, {}, status),
  );
}
beforeEach(() => {
  useSession.setState((state) => ({
    status: 'authenticated',
    token: 'old-token',
    user,
    epoch: state.epoch + 1,
  }));
  queryClient.clear();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: vi.fn((_name: string, callback: () => Promise<unknown>) => callback()) },
  });
});
describe('Sesiones y renovación', () => {
  it('comparte una renovación entre peticiones simultáneas y envía CSRF', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.headers.get('X-PatziShop-CSRF')).toBe('1');
      await new Promise((resolve) => setTimeout(resolve, 15));
      return response(config, grant);
    });
    authTransport.defaults.adapter = adapter;
    await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(navigator.locks.request).toHaveBeenCalledWith('patzishop-session', expect.any(Function));
    expect(useSession.getState().token).toBe('new-token');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('reintenta un 401 una sola vez con el token renovado', async () => {
    authTransport.defaults.adapter = async (config) => response(config, grant);
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.headers.get('Authorization') === 'Bearer old-token') reject(config, 401);
      return response(config, user);
    });
    api.defaults.adapter = adapter;
    expect((await api.get('/auth/me')).data).toEqual(user);
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it('un segundo 401 termina el reintento sin bucle', async () => {
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, grant));
    authTransport.defaults.adapter = refresh;
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => reject(config, 401));
    api.defaults.adapter = adapter;
    await expect(api.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(useSession.getState().status).toBe('guest');
  });
  it('limpia la cuenta y la caché cuando la cookie deja de ser válida', async () => {
    queryClient.setQueryData(['private'], user);
    authTransport.defaults.adapter = async (config) => reject(config, 401);
    await expect(refreshSession()).rejects.toBeInstanceOf(AxiosError);
    expect(useSession.getState().status).toBe('guest');
    expect(queryClient.getQueryData(['private'])).toBeUndefined();
  });
  it('no restaura una sesión cambiada mientras había una renovación pendiente', async () => {
    let finish!: () => void;
    const waiting = new Promise<void>((resolve) => {
      finish = resolve;
    });
    authTransport.defaults.adapter = async (config) => {
      await waiting;
      return response(config, grant);
    };
    const pending = refreshSession();
    useSession.setState((state) => ({
      status: 'guest',
      user: null,
      token: null,
      epoch: state.epoch + 1,
    }));
    finish();
    await expect(pending).rejects.toThrow('SESSION_CHANGED');
    expect(useSession.getState().user).toBeNull();
  });
  it('no acepta una respuesta privada de una identidad anterior', async () => {
    api.defaults.adapter = async (config) => {
      useSession.setState((state) => ({ epoch: state.epoch + 1 }));
      return response(config, user);
    };
    await expect(api.get('/auth/me')).rejects.toThrow('SESSION_CHANGED');
  });
  it('solo limpia la sesión tras confirmar el logout; conserva la cuenta si falla', async () => {
    authTransport.defaults.adapter = async (config) => reject(config, 503);
    await expect(logout()).rejects.toBeInstanceOf(AxiosError);
    expect(useSession.getState().status).toBe('authenticated');
    authTransport.defaults.adapter = async (config) => response(config, null, 204);
    await logout();
    expect(useSession.getState().status).toBe('guest');
  });
  it('distingue una caída de red de una sesión anónima', async () => {
    authTransport.defaults.adapter = async () => {
      throw new Error('offline');
    };
    await expect(refreshSession()).rejects.toThrow('offline');
    expect(useSession.getState().status).toBe('unavailable');
  });
  it('rechaza una respuesta de login que no cumple el contrato', async () => {
    authTransport.defaults.adapter = async (config) =>
      response(config, { ...grant, user: { ...user, role: 'ROOT' } });
    await expect(
      authenticate('login', { email: user.email, password: 'una-clave-muy-larga' }),
    ).rejects.toThrow();
    expect(useSession.getState().user).toBeNull();
  });
  it('bloquea autenticación si el navegador no coordina las renovaciones', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    await expect(
      authenticate('login', { email: user.email, password: 'una-clave-muy-larga' }),
    ).rejects.toThrow('UNSUPPORTED_BROWSER');
  });
});
