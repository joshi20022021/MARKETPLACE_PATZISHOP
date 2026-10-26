import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import https from 'node:https';
import { fileURLToPath, URL } from 'node:url';
import { Buffer } from 'node:buffer';
import console from 'node:console';

const root = fileURLToPath(new URL('../', import.meta.url));
const compose = ['compose', '--env-file', 'docker/.env', '-f', 'compose.stack.yml'];
function docker(args, input) {
  const result = spawnSync('docker', [...compose, ...args], {
    cwd: root,
    encoding: 'utf8',
    input,
  });
  assert.equal(result.status, 0, `Docker fallo: ${args[0]}. Consulta stack:logs.`);
  return result.stdout;
}
const config = Object.fromEntries(
  (await readFile(new URL('../docker/.env', import.meta.url), 'utf8'))
    .split(/\r?\n/u)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
assert.equal(config.APP_HOST, 'localhost', 'Esta comprobacion exige APP_HOST=localhost.');
const origin = `https://localhost:${config.HTTPS_PORT}`;
await mkdir(new URL('../tmp/', import.meta.url), { recursive: true });
docker(['cp', 'frontend:/data/caddy/pki/authorities/local/root.crt', 'tmp/patzishop-root.crt']);
const agent = new https.Agent({
  ca: await readFile(new URL('../tmp/patzishop-root.crt', import.meta.url)),
});
async function call(path, method = 'GET', body, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      `${origin}${path}`,
      {
        method,
        agent,
        family: 4,
        timeout: 15000,
        headers: {
          Origin: origin,
          'X-PatziShop-CSRF': '1',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: response.statusCode,
            headers: response.headers,
            text,
            json: () => JSON.parse(text),
          });
        });
      },
    );
    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error('Tiempo de espera agotado.')));
    request.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
const email = `stack-${randomUUID()}@example.test`;
try {
  for (const path of ['/', '/ingresar', '/productos/prueba-directa']) {
    const response = await call(path);
    assert.equal(response.status, 200);
    assert.match(response.text, /<div id="root">/u);
    const asset = response.text.match(/src="(\/assets\/[^" ]+\.js)"/u)?.[1];
    assert(asset, 'Falta el bundle compilado.');
    const bundle = await call(asset);
    assert.equal(bundle.status, 200);
    assert(bundle.headers['content-type'].includes('javascript'), 'Bundle no servido como JS.');
  }
  const ready = await call('/api/v1/health/ready');
  assert.equal(ready.status, 200);
  assert.equal(ready.headers['cache-control'], 'no-store');
  assert.equal((await call('/api/docs')).status, 404);
  assert.equal((await call('/api/v1/auth/me')).status, 401);
  const grant = await call('/api/v1/auth/register', 'POST', {
    name: 'Cliente Docker',
    email,
    password: `${randomUUID()}!`,
  });
  assert.equal(grant.status, 201);
  const setCookie = grant.headers['set-cookie'][0];
  assert(/; Secure/u.test(setCookie), 'Falta Secure.');
  assert(/; HttpOnly/u.test(setCookie), 'Falta HttpOnly.');
  assert(/; SameSite=Strict/u.test(setCookie), 'Falta SameSite Strict.');
  const auth = { Authorization: `Bearer ${grant.json().accessToken}` };
  assert.equal((await call('/api/v1/auth/me', 'GET', undefined, auth)).status, 200);
  assert.equal((await call('/api/v1/cart', 'GET', undefined, auth)).status, 200);
  const refreshed = await call('/api/v1/auth/refresh', 'POST', undefined, {
    Cookie: setCookie.split(';')[0],
  });
  assert.equal(refreshed.status, 200);
  assert.equal(
    (
      await call('/api/v1/auth/logout', 'POST', undefined, {
        Cookie: refreshed.headers['set-cookie'][0].split(';')[0],
      })
    ).status,
    204,
  );
  const rejected = await call('/api/v1/auth/me', 'GET', undefined, {
    Authorization: `Bearer ${refreshed.json().accessToken}`,
  });
  assert.equal(rejected.status, 401);
  console.log('STACK OK: TLS verificado, SPA, proxy, readiness, sesion/cookies y revocacion.');
} finally {
  docker(
    ['exec', '-T', 'backend', 'node'],
    `const {createDatabaseClient}=require('./dist/config/database');
const db=createDatabaseClient();
(async()=>{try{await db.user.deleteMany({where:{email:${JSON.stringify(email)}}});
if(await db.user.count({where:{email:${JSON.stringify(email)}}}))process.exitCode=1;
}finally{await db.$disconnect()}})().catch(()=>{process.exitCode=1});`,
  );
  agent.destroy();
}
