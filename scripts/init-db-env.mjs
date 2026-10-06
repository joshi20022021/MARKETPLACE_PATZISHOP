import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('.env.example', root), 'utf8');
const content = template.replace(
  /^POSTGRES_PASSWORD=$/mu,
  `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}`,
);

try {
  await writeFile(new URL('.env', root), content, { flag: 'wx', mode: 0o600 });
  process.stdout.write(
    '.env local creado con contraseña aleatoria. No se ha mostrado el secreto.\n',
  );
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  process.stdout.write('.env ya existe; se conservó sin modificaciones.\n');
}
