import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import pg from 'pg';
import { readEnv, root, validateTestDatabase } from './test-environment.mjs';
async function main() {
  const source = await readEnv('backend/.env');
  const local = await readEnv('backend/.env.test');
  if (!source.DATABASE_URL) throw new Error('Primero prepara backend/.env según docs/database.md.');
  const base = new URL(source.DATABASE_URL);
  const target = new URL(base);
  target.pathname = '/patzishop_test';
  target.search = '';
  target.hash = '';
  const connectionString = validateTestDatabase(target.toString());
  if (base.pathname === target.pathname)
    throw new Error('La base de desarrollo debe ser distinta de patzishop_test.');
  if (local.DATABASE_URL && validateTestDatabase(local.DATABASE_URL) !== connectionString)
    throw new Error('backend/.env.test ya apunta a otro entorno; no se sobrescribió.');
  const db = new pg.Client({
    connectionString: base.toString(),
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
  try {
    await db.connect();
    const existing = await db.query(
      'SELECT pg_get_userbyid(datdba) AS owner, current_user AS actor FROM pg_database WHERE datname = $1',
      ['patzishop_test'],
    );
    if (existing.rows[0] && existing.rows[0].owner !== existing.rows[0].actor)
      throw new Error('La base de pruebas existente pertenece a otro usuario.');
    if (!existing.rowCount) await db.query('CREATE DATABASE "patzishop_test"');
    if (!local.DATABASE_URL)
      await writeFile(
        new URL('backend/.env.test', root),
        `DATABASE_URL=${JSON.stringify(connectionString)}\n`,
        { flag: 'wx', mode: 0o600 },
      );
    console.log(
      'Base patzishop_test preparada sin reset ni borrado. Ejecuta npm run test:migrate.',
    );
  } finally {
    await db.end();
  }
}
void main().catch(() => {
  console.error(
    'No se pudo preparar la BD de pruebas. Comprueba PostgreSQL local, permisos de creación y backend/.env.test; no se muestran credenciales.',
  );
  process.exitCode = 1;
});
