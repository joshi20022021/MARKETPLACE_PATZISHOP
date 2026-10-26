import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
import console from 'node:console';
const directory = new URL('../docker/', import.meta.url);
const template = await readFile(new URL('.env.example', directory), 'utf8');
try {
  await writeFile(
    new URL('.env', directory),
    template
      .replace(/^POSTGRES_PASSWORD=$/mu, `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}`)
      .replace(/^JWT_ACCESS_SECRET=$/mu, `JWT_ACCESS_SECRET=${randomBytes(32).toString('hex')}`),
    { flag: 'wx', mode: 0o600 },
  );
  console.log('docker/.env creado. Secretos generados sin mostrarlos.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('docker/.env existente conservado.');
}
