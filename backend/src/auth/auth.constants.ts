export const JWT_ISSUER = 'patzishop';
export const JWT_AUDIENCE = 'patzishop-web';
export const REFRESH_COOKIE = 'patzishop_refresh';
export const AUTH_COOKIE_PATH = '/api/v1/auth';
export const CSRF_HEADER = 'X-PatziShop-CSRF';
export const CSRF_HEADER_DOC = {
  name: CSRF_HEADER,
  required: true,
  schema: { type: 'string', enum: ['1'] },
  description: 'Enviar 1. Cabecera custom exigida en todos los POST de autenticación.',
};
