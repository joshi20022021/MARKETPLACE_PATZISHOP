import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import process from 'node:process';
import { randomBytes } from 'node:crypto';
import { parse } from 'dotenv';
import pg from 'pg';
export const root = new URL('../', import.meta.url);
export async function readEnv(path) {
  try {
    return parse(await readFile(new URL(path, root), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}
export function validateTestDatabase(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Configura TEST_DATABASE_URL o ejecuta npm run test:prepare.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/patzishop_test' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Las pruebas completas requieren PostgreSQL local, base patzishop_test y URL sin parámetros.',
    );
  return url.toString();
}
export async function testEnvironment() {
  const local = await readEnv('backend/.env.test');
  const DATABASE_URL = validateTestDatabase(process.env.TEST_DATABASE_URL ?? local.DATABASE_URL);
  return {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL,
    JWT_ACCESS_SECRET: randomBytes(48).toString('hex'),
    JWT_ACCESS_TTL: '15m',
    REFRESH_TOKEN_TTL_DAYS: '7',
    HOST: '127.0.0.1',
    PORT: '3000',
    CORS_ORIGIN: 'http://localhost:5173',
    SWAGGER_ENABLED: 'true',
  };
}
export async function fixtureCounts(connectionString) {
  const db = new pg.Client({
    connectionString: validateTestDatabase(connectionString),
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
  const counts = {};
  try {
    await db.connect();
    for (const table of [
      'User',
      'Business',
      'Product',
      'ProductImage',
      'Order',
      'SellerOrder',
      'OrderItem',
      'OrderStatusHistory',
      'InventoryMovement',
      'Cart',
      'CartItem',
      'Address',
      'RefreshToken',
    ]) {
      // Identifiers come exclusively from this fixed list, never from CLI or environment input.
      counts[table] = (
        await db.query(`SELECT count(*)::int AS count FROM "${table}"`)
      ).rows[0].count;
    }
    return counts;
  } finally {
    await db.end();
  }
}
