import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { REFRESH_COOKIE } from '../src/auth/auth.constants';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { ApiThrottleGuard } from '../src/security/api-throttle.guard';

let app: INestApplication;
let prisma: PrismaService;
const emails: string[] = [];
const password = 'Prueba-Segura-2026!';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieHeader = (response: Response): string => {
  const headers: unknown = response.headers['set-cookie'];
  assert(Array.isArray(headers));
  const value = headers.find((header: string) => header.startsWith(`${REFRESH_COOKIE}=`)) as
    string | undefined;
  assert(value);
  return value;
};
const cookie = (response: Response): string => cookieHeader(response).split(';')[0]!;
const token = (value: string) => value.slice(value.indexOf('=') + 1);
const post = (path: string) =>
  request(app.getHttpServer()).post(`/api/v1/auth/${path}`).set('X-PatziShop-CSRF', '1');
const me = (access: string) =>
  request(app.getHttpServer()).get('/api/v1/auth/me').auth(access, { type: 'bearer' });
async function register(role?: 'SELLER') {
  const email = `auth-${randomUUID()}@example.test`;
  emails.push(email);
  return post('register')
    .send({ email, password, name: ' Cliente Prueba ', ...(role ? { role } : {}) })
    .expect(201);
}

before(async () => {
  // Auth regression tests isolate session rules; the real limiter is covered by test:security.
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ApiThrottleGuard)
    .useValue({ canActivate: () => true })
    .compile();
  app = module.createNestApplication({ logger: false });
  prisma = app.get(PrismaService);
  configureApp(app);
  await app.init();
});
after(async () => {
  try {
    if (prisma) await prisma.user.deleteMany({ where: { email: { in: emails } } });
  } finally {
    if (app) await app.close();
  }
});

test('registro normaliza correo y nombre, crea CUSTOMER, hash bcrypt y cookie privada', async () => {
  const email = `auth-${randomUUID()}@example.test`;
  emails.push(email);
  const response = await post('register')
    .send({ email: ` ${email.toUpperCase()} `, password, name: ' Cliente Prueba ' })
    .expect(201);
  assert.equal(response.body.user.email, email);
  assert.equal(response.body.user.name, 'Cliente Prueba');
  assert.equal(response.body.user.role, 'CUSTOMER');
  assert.equal(response.body.tokenType, 'Bearer');
  assert.equal(response.body.expiresIn, 900);
  assert.equal(response.body.refreshToken, undefined);
  assert.equal(response.body.user.passwordHash, undefined);
  assert.equal(response.headers['cache-control'], 'no-store');
  const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
  assert.equal(bcrypt.getRounds(stored.passwordHash), 12);
  assert(await bcrypt.compare(password, stored.passwordHash));
  const refresh = token(cookie(response));
  const session = await prisma.refreshToken.findUniqueOrThrow({
    where: { tokenHash: digest(refresh) },
  });
  assert.notEqual(session.tokenHash, refresh);
  assert.match(cookieHeader(response), /HttpOnly/u);
  assert.match(cookieHeader(response), /SameSite=Strict/u);
  assert.match(cookieHeader(response), /Path=\/api\/v1\/auth/u);
  assert.deepEqual((await me(response.body.accessToken).expect(200)).body, response.body.user);
});

test('registro permite SELLER y rechaza ADMIN, datos extra y contraseñas inválidas', async () => {
  assert.equal((await register('SELLER')).body.user.role, 'SELLER');
  for (const extra of [
    { role: 'ADMIN' },
    { isActive: true },
    { password: 'short' },
    { password: 'á'.repeat(37) },
    { email: 'invalid' },
    { name: ' ' },
  ]) {
    const email = `auth-${randomUUID()}@example.test`;
    emails.push(email);
    await post('register')
      .send({ email, password, name: 'Prueba', ...extra })
      .expect(400);
  }
});

test('correo duplicado normalizado y registros concurrentes devuelven 409', async () => {
  const first = await register();
  const duplicate = await post('register')
    .send({ email: first.body.user.email.toUpperCase(), password, name: 'Otro' })
    .expect(409);
  assert.equal(duplicate.body.error, 'EMAIL_ALREADY_EXISTS');
  const email = `auth-${randomUUID()}@example.test`;
  emails.push(email);
  const results = await Promise.all(
    [1, 2].map(() => post('register').send({ email, password, name: 'Prueba' })),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
});

test('login normaliza correo; credenciales incorrectas y cuenta inactiva tienen el mismo error', async () => {
  const created = await register();
  await post('login').send({ email: created.body.user.email.toUpperCase(), password }).expect(200);
  for (const data of [
    { email: created.body.user.email, password: 'wrong' },
    { email: 'missing@example.test', password },
  ]) {
    const response = await post('login').send(data).expect(401);
    assert.equal(response.body.error, 'INVALID_CREDENTIALS');
    assert.equal(response.body.message, 'Credenciales inválidas');
  }
  await prisma.user.update({ where: { id: created.body.user.id }, data: { isActive: false } });
  const inactive = await post('login')
    .send({ email: created.body.user.email, password })
    .expect(401);
  assert.equal(inactive.body.error, 'INVALID_CREDENTIALS');
  await me(created.body.accessToken).expect(401);
  await post('refresh').set('Cookie', cookie(created)).expect(401);
});

test('rotación conserva vencimiento, enlaza reemplazo y reutilización revoca toda la familia', async () => {
  const first = await register();
  const old = await prisma.refreshToken.findUniqueOrThrow({
    where: { tokenHash: digest(token(cookie(first))) },
  });
  const next = await post('refresh').set('Cookie', cookie(first)).expect(200);
  assert.notEqual(cookie(next), cookie(first));
  const previous = await prisma.refreshToken.findUniqueOrThrow({ where: { id: old.id } });
  const replacement = await prisma.refreshToken.findUniqueOrThrow({
    where: { id: previous.replacedById! },
  });
  assert(previous.revokedAt);
  assert.equal(replacement.familyId, old.familyId);
  assert.equal(replacement.expiresAt.getTime(), old.expiresAt.getTime());
  await me(next.body.accessToken).expect(200);
  await post('refresh').set('Cookie', cookie(first)).expect(401);
  assert.equal(
    await prisma.refreshToken.count({ where: { familyId: old.familyId, revokedAt: null } }),
    0,
  );
  await me(next.body.accessToken).expect(401);
  await post('refresh').set('Cookie', cookie(next)).expect(401);
});

test('refresh concurrente detecta reutilización y no deja ninguna sesión activa', async () => {
  const first = await register();
  const results = await Promise.all([1, 2].map(() => post('refresh').set('Cookie', cookie(first))));
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 401]);
  const successful = results.find((result) => result.status === 200)!;
  await me(successful.body.accessToken).expect(401);
  assert.equal(
    await prisma.refreshToken.count({ where: { userId: first.body.user.id, revokedAt: null } }),
    0,
  );
});

test('logout borra cookie, invalida JWT y refresh, y respeta sesiones de otros dispositivos', async () => {
  const first = await register();
  const other = await post('login').send({ email: first.body.user.email, password }).expect(200);
  const logout = await post('logout').set('Cookie', cookie(first)).expect(204);
  assert.match(cookieHeader(logout), /Expires=Thu, 01 Jan 1970/u);
  await me(first.body.accessToken).expect(401);
  await post('refresh').set('Cookie', cookie(first)).expect(401);
  await me(other.body.accessToken).expect(200);
  await post('logout').set('Cookie', cookie(first)).expect(204);
  await post('logout').expect(204);
});

test('refresh rechaza token ausente, desconocido, enviado en JSON o vencido', async () => {
  const first = await register();
  const session = await prisma.refreshToken.findUniqueOrThrow({
    where: { tokenHash: digest(token(cookie(first))) },
  });
  await prisma.refreshToken.update({
    where: { id: session.id },
    data: { createdAt: new Date(Date.now() - 2000), expiresAt: new Date(Date.now() - 1000) },
  });
  await post('refresh').set('Cookie', cookie(first)).expect(401);
  await me(first.body.accessToken).expect(401);
  const empty = await post('refresh').expect(401);
  assert.match(cookieHeader(empty), /Expires=Thu, 01 Jan 1970/u);
  await post('refresh')
    .set('Cookie', `${REFRESH_COOKIE}=${'a'.repeat(43)}`)
    .expect(401);
  await post('refresh')
    .send({ refreshToken: token(cookie(first)) })
    .expect(401);
});

test('JWT requiere firma, vencimiento, emisor, audiencia, algoritmo y familia válidos', async () => {
  const first = await register();
  const jwt = app.get(JwtService);
  const payload = jwt.decode<Record<string, unknown>>(first.body.accessToken);
  const base = { sub: payload.sub, sid: payload.sid, tokenUse: 'access' };
  const badTokens = await Promise.all([
    jwt.signAsync(base, { expiresIn: -1 }),
    jwt.signAsync(base, { issuer: 'untrusted' }),
    jwt.signAsync(base, { audience: 'untrusted' }),
    jwt.signAsync(base, { algorithm: 'HS384' }),
    jwt.signAsync({ ...base, sid: randomUUID() }),
    jwt.signAsync({ ...base, sub: 'not-a-uuid' }),
    jwt.signAsync({ ...base, tokenUse: 'refresh' }),
    jwt.signAsync(base, { secret: 'wrong-secret' }),
  ]);
  await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  for (const access of ['malformed', ...badTokens]) await me(access).expect(401);
});

test('perfil devuelve el rol actual de PostgreSQL, sin confiar en atributos del JWT', async () => {
  const first = await register();
  await prisma.user.update({
    where: { id: first.body.user.id },
    data: { role: 'SELLER', name: 'Nombre nuevo' },
  });
  const profile = await me(first.body.accessToken).expect(200);
  assert.equal(profile.body.role, 'SELLER');
  assert.equal(profile.body.name, 'Nombre nuevo');
  assert.deepEqual(Object.keys(profile.body).sort(), ['email', 'id', 'name', 'role']);
});

test('POST auth exige encabezado y rechaza orígenes externos o null', async () => {
  for (const endpoint of ['register', 'login', 'refresh', 'logout']) {
    await request(app.getHttpServer()).post(`/api/v1/auth/${endpoint}`).expect(403);
    for (const origin of ['https://untrusted.test', 'null'])
      await post(endpoint).set('Origin', origin).expect(403);
  }
  await post('logout').set('Origin', 'http://localhost:5173').expect(204);
  await post('logout')
    .set('Host', '127.0.0.1:3000')
    .set('Origin', 'http://127.0.0.1:3000')
    .expect(204);
});

test('cookie usa Secure en producción y el mismo alcance al borrarse', async () => {
  const writes: unknown[][] = [];
  const clears: unknown[][] = [];
  const service = {
    logout: async () => undefined,
    login: async () => ({ body: {}, refreshToken: 'opaque', expiresAt: new Date() }),
  } as unknown as AuthService;
  const controller = new AuthController(service, new ConfigService({ NODE_ENV: 'production' }));
  const response = {
    cookie: (...args: unknown[]) => writes.push(args),
    clearCookie: (...args: unknown[]) => clears.push(args),
  } as unknown as import('express').Response;
  await controller.login({ email: 'test@example.test', password }, response);
  await controller.logout({ cookies: {} } as import('express').Request, response);
  const options = writes[0]![2] as Record<string, unknown>;
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'strict');
  const { expires, ...scope } = options;
  assert(expires instanceof Date);
  assert.deepEqual(clears[0]![1], scope);
});

test('OpenAPI documenta cinco endpoints, bearer, cookie y encabezado CSRF', async () => {
  const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
  for (const endpoint of ['register', 'login', 'refresh', 'logout', 'me'])
    assert(response.body.paths[`/api/v1/auth/${endpoint}`]);
  assert(response.body.components.securitySchemes.bearer);
  assert.equal(response.body.components.securitySchemes.cookie.name, REFRESH_COOKIE);
  assert(
    response.body.paths['/api/v1/auth/refresh'].post.parameters.some(
      (value: { name: string }) => value.name === 'X-PatziShop-CSRF',
    ),
  );
});
