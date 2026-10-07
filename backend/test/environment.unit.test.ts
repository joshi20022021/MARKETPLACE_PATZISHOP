import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEnvironment } from '../src/config/environment';

const valid = {
  DATABASE_URL: 'postgresql://user:PRIVATE_PASSWORD@127.0.0.1:5433/test',
  JWT_ACCESS_SECRET: 'a'.repeat(64),
};

test('aplica valores por defecto y transforma el puerto', () => {
  const config = validateEnvironment({ ...valid, PORT: '3001' });
  assert.equal(config.PORT, 3001);
  assert.equal(config.HOST, '127.0.0.1');
  assert.equal(config.SWAGGER_ENABLED, true);
});

test('Swagger se desactiva por defecto en producción y acepta false explícito', () => {
  assert.equal(validateEnvironment({ ...valid, NODE_ENV: 'production' }).SWAGGER_ENABLED, false);
  assert.equal(validateEnvironment({ ...valid, SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED, false);
});

test('rechaza puerto, entorno y booleanos inválidos sin mostrar valores', () => {
  for (const invalid of [
    { PORT: '65536' },
    { PORT: '' },
    { NODE_ENV: 'unknown' },
    { SWAGGER_ENABLED: 'yes' },
  ]) {
    assert.throws(() => validateEnvironment({ ...valid, ...invalid }), /Configuración inválida/u);
  }
});

test('rechaza URL ausente, incorrecta o sin base de datos, sin revelar secretos', () => {
  for (const DATABASE_URL of [
    undefined,
    'INVALID_PRIVATE_SECRET',
    'https://user:PRIVATE_PASSWORD@example.test/test',
    'postgresql://localhost',
  ]) {
    assert.throws(
      () => validateEnvironment({ ...valid, DATABASE_URL }),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.equal(error.message, 'Configuración inválida: DATABASE_URL.');
        assert(!error.message.includes('PRIVATE'));
        return true;
      },
    );
  }
});

test('valida secretos y límites de duración sin revelar valores', () => {
  assert.equal(validateEnvironment(valid).JWT_ACCESS_TTL_SECONDS, 900);
  assert.equal(
    validateEnvironment({ ...valid, JWT_ACCESS_TTL: '1h' }).JWT_ACCESS_TTL_SECONDS,
    3600,
  );
  for (const invalid of [
    { JWT_ACCESS_SECRET: undefined },
    { JWT_ACCESS_SECRET: 'short' },
    { JWT_ACCESS_SECRET: ' '.repeat(64) },
    { JWT_ACCESS_TTL: '0s' },
    { JWT_ACCESS_TTL: '2h' },
    { JWT_ACCESS_TTL: '15' },
    { REFRESH_TOKEN_TTL_DAYS: 0 },
    { REFRESH_TOKEN_TTL_DAYS: 31 },
  ]) {
    assert.throws(() => validateEnvironment({ ...valid, ...invalid }), /Configuración inválida/u);
  }
});

test('CORS exige un origen HTTP explícito sin rutas ni credenciales', () => {
  for (const CORS_ORIGIN of [
    '*',
    'http://localhost:5173/path',
    'http://user:pass@localhost:5173',
  ]) {
    assert.throws(() => validateEnvironment({ ...valid, CORS_ORIGIN }), /CORS_ORIGIN/u);
  }
});
