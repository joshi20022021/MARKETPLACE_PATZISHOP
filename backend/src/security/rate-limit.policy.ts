export const RATE_LIMIT_WINDOW_MS = 60000;
export const API_RATE_LIMIT = 120;
export const AUTH_RATE_LIMITS = { register: 5, login: 10, refresh: 30, logout: 30 } as const;
export const JSON_BODY_LIMIT = '32kb';
