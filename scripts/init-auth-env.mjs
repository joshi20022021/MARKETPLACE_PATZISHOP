import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';
import { parseEnv } from 'node:util';

async function main() {
  const file = new URL('../backend/.env', import.meta.url);
  const content = await readFile(file, 'utf8');
  if (parseEnv(content).JWT_ACCESS_SECRET) {
    process.stdout.write(
      'JWT_ACCESS_SECRET ya existe; se conservó el entorno sin modificaciones.\n',
    );
    return;
  }
  const line = `JWT_ACCESS_SECRET=${randomBytes(32).toString('hex')}`;
  const updated = /^JWT_ACCESS_SECRET\s*=/mu.test(content)
    ? content.replace(/^JWT_ACCESS_SECRET\s*=.*$/mu, line)
    : `${content.trimEnd()}\n${line}\n`;
  await writeFile(file, updated, { mode: 0o600 });
  process.stdout.write('Secreto JWT aleatorio creado en backend/.env, sin imprimirlo.\n');
}

main().catch(() => {
  process.stderr.write(
    'No se pudo configurar JWT. Prepara backend/.env con db:backend-env primero.\n',
  );
  process.exitCode = 1;
});
