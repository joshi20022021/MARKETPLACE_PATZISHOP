import axios, { type InternalAxiosRequestConfig } from 'axios';
import { create } from 'zustand';
import { grantSchema, type User } from './contracts';
import { queryClient } from './query-client';
import { statusOf } from './errors';

export function apiBaseUrl(value: string = '/api/v1'): string {
  if (value === '/api/v1') return value;
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/api/v1'
  )
    throw new Error('VITE_API_URL debe ser /api/v1 o una URL HTTP(S) que termine en /api/v1.');
  return value;
}
const transportOptions = {
  baseURL: apiBaseUrl(import.meta.env.VITE_API_URL),
  withCredentials: true,
  timeout: 15000,
};
export const authTransport = axios.create(transportOptions);
export const api = axios.create(transportOptions);
type SessionStatus = 'loading' | 'guest' | 'authenticated' | 'unavailable';
export const useSession = create<{
  status: SessionStatus;
  token: string | null;
  user: User | null;
  epoch: number;
}>(() => ({
  status: 'loading',
  token: null,
  user: null,
  epoch: 0,
}));
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('patzishop-session') : null;
function clearSession(status: SessionStatus = 'guest') {
  useSession.setState((state) => ({ status, user: null, token: null, epoch: state.epoch + 1 }));
  void queryClient.cancelQueries();
  queryClient.clear();
}
async function locked<T>(operation: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('UNSUPPORTED_BROWSER');
  return navigator.locks.request('patzishop-session', operation);
}
let refreshPromise: Promise<void> | null = null;
export function refreshSession(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  const epoch = useSession.getState().epoch;
  refreshPromise = locked(async () => {
    if (epoch !== useSession.getState().epoch) throw new Error('SESSION_CHANGED');
    try {
      const response = await authTransport.post(
        '/auth/refresh',
        {},
        { headers: { 'X-PatziShop-CSRF': '1' } },
      );
      const grant = grantSchema.parse(response.data);
      if (epoch !== useSession.getState().epoch) throw new Error('SESSION_CHANGED');
      const previous = useSession.getState().user;
      if (previous && (previous.id !== grant.user.id || previous.role !== grant.user.role)) {
        clearSession('loading');
      }
      useSession.setState({ status: 'authenticated', user: grant.user, token: grant.accessToken });
    } catch (error) {
      if (epoch === useSession.getState().epoch)
        clearSession([401, 403].includes(statusOf(error) ?? 0) ? 'guest' : 'unavailable');
      throw error;
    }
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
let initialized = false;
export function initializeSession(): void {
  if (initialized) return;
  initialized = true;
  void refreshSession().catch(() => {
    if (useSession.getState().status === 'loading') clearSession('unavailable');
  });
}
export async function authenticate(
  mode: 'login' | 'register',
  input: Record<string, string>,
): Promise<void> {
  await locked(async () => {
    clearSession('loading');
    const epoch = useSession.getState().epoch;
    try {
      const response = await authTransport.post(`/auth/${mode}`, input, {
        headers: { 'X-PatziShop-CSRF': '1' },
      });
      const grant = grantSchema.parse(response.data);
      if (epoch !== useSession.getState().epoch) throw new Error('SESSION_CHANGED');
      useSession.setState({ status: 'authenticated', user: grant.user, token: grant.accessToken });
      channel?.postMessage('changed');
    } catch (error) {
      if (epoch === useSession.getState().epoch) clearSession();
      throw error;
    }
  });
}
export async function logout(): Promise<void> {
  await locked(async () => {
    await authTransport.post('/auth/logout', {}, { headers: { 'X-PatziShop-CSRF': '1' } });
    clearSession();
    channel?.postMessage('logout');
  });
}
channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.data === 'logout') clearSession();
  if (event.data === 'changed') {
    clearSession('loading');
    void refreshSession().catch(() => {
      if (useSession.getState().status === 'loading') clearSession('unavailable');
    });
  }
});
type AuthConfig = InternalAxiosRequestConfig & { sessionEpoch?: number; retried?: boolean };
api.interceptors.request.use((config: AuthConfig) => {
  const session = useSession.getState();
  if (config.sessionEpoch !== undefined && config.sessionEpoch !== session.epoch)
    throw new Error('SESSION_CHANGED');
  config.sessionEpoch = session.epoch;
  if (session.token) config.headers.set('Authorization', `Bearer ${session.token}`);
  else throw new Error('SESSION_REQUIRED');
  return config;
});
api.interceptors.response.use(
  (response) => {
    if ((response.config as AuthConfig).sessionEpoch !== useSession.getState().epoch)
      throw new Error('SESSION_CHANGED');
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config || error.response?.status !== 401) throw error;
    const config = error.config as AuthConfig;
    if (config.retried || config.sessionEpoch !== useSession.getState().epoch) throw error;
    config.retried = true;
    if (config.headers.get('Authorization') === `Bearer ${useSession.getState().token}`)
      await refreshSession();
    return api.request(config);
  },
);
