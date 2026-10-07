import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';
import { parseEnv } from 'node:util';

const root = new URL('../', import.meta.url);

async function main() {
  const config = parseEnv(await readFile(new URL('.env', root), 'utf8'));
  for (const key of ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']) {
    if (!config[key]) throw new Error('Configuración PostgreSQL incompleta.');
  }
  const port = Number(config.POSTGRES_PORT || '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Puerto inválido.');
  const url = new URL(`postgresql://127.0.0.1:${port}`);
  url.username = config.POSTGRES_USER;
  url.password = config.POSTGRES_PASSWORD;
  url.pathname = `/${encodeURIComponent(config.POSTGRES_DB)}`;
  url.searchParams.set('schema', 'public');
  const template = await readFile(new URL('backend/.env.example', root), 'utf8');
  const content = template.replace(
    /^DATABASE_URL=$/mu,
    `DATABASE_URL='${url.href.replaceAll("'", '%27')}'`,
  );

  try {
    await writeFile(new URL('backend/.env', root), content, { flag: 'wx', mode: 0o600 });
    process.stdout.write(
      'backend/.env creado desde la configuración local, sin mostrar secretos.\n',
    );
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    process.stdout.write('backend/.env ya existe; se conservó sin modificaciones.\n');
  }
}

main().catch(() => {
  process.stderr.write('No se pudo preparar backend/.env. Revisa el .env raíz y sus variables.\n');
  process.exitCode = 1;
});
