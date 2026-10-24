import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, test } from 'node:test';
import request from 'supertest';
import { businessContext, businessInput } from './business-test-context';
let ctx: Awaited<ReturnType<typeof businessContext>>;
beforeEach(async () => {
  ctx = await businessContext();
});
afterEach(async () => {
  if (ctx) await ctx.close();
});
const client = () => request(ctx.app.getHttpServer());
test('todas las operaciones privadas publicadas por AppModule exigen JWT antes de DTO y servicios', async () => {
  const spec = (await client().get('/api/docs-json').expect(200)).body as {
    paths: Record<string, Record<string, unknown>>;
  };
  let checked = 0;
  for (const [path, operations] of Object.entries(spec.paths)) {
    if (!/^\/api\/v1\/(seller|admin|cart|checkout|orders|auth\/me)(?:\/|$)/u.test(path)) continue;
    for (const method of ['get', 'post', 'patch', 'delete'] as const) {
      if (!operations[method]) continue;
      const call = client()[method](path.replace(/\{[^}]+\}/gu, randomUUID()));
      if (method === 'post' || method === 'patch') call.send({});
      const response = await call.expect(401);
      assert.equal(response.headers['cache-control'], 'no-store');
      checked++;
    }
  }
  assert(checked >= 30, 'La matriz debe incluir todos los módulos privados reales.');
});
test('Host y cabeceras forwarded no convierten un origen externo en confiable', async () => {
  for (const path of ['login', 'register', 'refresh', 'logout']) {
    const response = await client()
      .post(`/api/v1/auth/${path}`)
      .set('Host', 'untrusted.test')
      .set('Origin', 'http://untrusted.test')
      .set('X-PatziShop-CSRF', '1')
      .send({})
      .expect(403);
    assert.equal(response.body.error, 'CSRF_REJECTED');
  }
  await client()
    .post('/api/v1/auth/logout')
    .set('Host', 'untrusted.test')
    .set('X-Forwarded-Host', 'localhost:5173')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://untrusted.test')
    .set('X-PatziShop-CSRF', '1')
    .send({})
    .expect(403);
  await client()
    .post('/api/v1/auth/logout')
    .set('Origin', 'http://localhost:5173')
    .set('X-PatziShop-CSRF', '1')
    .send({})
    .expect(204);
});
test('401, 403, 404 y validación no permiten cachear respuestas API privadas', async () => {
  const seller = await ctx.identity();
  const responses = [
    await client().get('/api/v1/seller/business').expect(401),
    await client()
      .get('/api/v1/admin/dashboard')
      .auth(seller.token, { type: 'bearer' })
      .expect(403),
    await client()
      .get(`/api/v1/seller/products/${randomUUID()}`)
      .auth(seller.token, { type: 'bearer' })
      .expect(404),
    await client()
      .get('/api/v1/seller/products/not-uuid')
      .auth(seller.token, { type: 'bearer' })
      .expect(400),
  ];
  for (const response of responses) {
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers.pragma, 'no-cache');
  }
});
test('formularios y texto plano no se interpretan como cuerpos de escritura JSON', async () => {
  const seller = await ctx.identity();
  const business = (
    await client()
      .post('/api/v1/seller/business')
      .auth(seller.token, { type: 'bearer' })
      .send(businessInput())
      .expect(201)
  ).body;
  await client()
    .patch('/api/v1/seller/business')
    .auth(seller.token, { type: 'bearer' })
    .type('form')
    .send({ name: 'No debe persistir' })
    .expect(415);
  await client()
    .patch('/api/v1/seller/business')
    .auth(seller.token, { type: 'bearer' })
    .type('text')
    .send('{"name":"Tampoco debe persistir"}')
    .expect(415);
  assert.equal(
    (await ctx.prisma.business.findUniqueOrThrow({ where: { id: business.id } })).name,
    business.name,
  );
});
test('JSON comprimido y charset no soportado responden 415 y conservan disponibilidad', async () => {
  for (const response of [
    await client()
      .post('/api/v1/auth/logout')
      .set('X-PatziShop-CSRF', '1')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send(gzipSync('{}'))
      .expect(415),
    await client()
      .post('/api/v1/auth/logout')
      .set('X-PatziShop-CSRF', '1')
      .set('Content-Type', 'application/json; charset=iso-8859-1')
      .send('{}')
      .expect(415),
  ]) {
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.body.error, 'UNSUPPORTED_MEDIA_TYPE');
  }
  await client().get('/api/v1/health').expect(200);
});
test('JSON malformado y excesivo no reflejan cuerpo ni query y nunca se cachean', async () => {
  for (const [payload, code] of [
    ['{"PRIVATE_SENTINEL":', 400],
    ['{"PRIVATE_SENTINEL":"' + 'x'.repeat(33000) + '"}', 413],
  ] as const) {
    const response = await client()
      .post('/api/v1/auth/login?private=QUERY_SENTINEL')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(code);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert(!JSON.stringify(response.body).includes('PRIVATE_SENTINEL'));
    assert(!JSON.stringify(response.body).includes('QUERY_SENTINEL'));
  }
});
test('paginación de pedidos rechaza notación científica, hexadecimal, signos y duplicados', async () => {
  for (const [role, path] of [
    ['CUSTOMER', '/api/v1/orders'],
    ['SELLER', '/api/v1/seller/orders'],
  ] as const) {
    const actor = await ctx.identity(role);
    for (const query of [
      'page=1e1',
      'limit=0x10',
      'page=%2B1',
      'page=1.0',
      'page=%201%20',
      'page=1&page=1',
    ])
      await client().get(`${path}?${query}`).auth(actor.token, { type: 'bearer' }).expect(400);
    const result = await client()
      .get(`${path}?page=2&limit=1`)
      .auth(actor.token, { type: 'bearer' })
      .expect(200);
    assert.equal(result.body.meta.page, 2);
    assert.equal(result.body.meta.limit, 1);
  }
});
test('campos anidados, importes e identidades extra se rechazan antes de tocar datos', async () => {
  const customer = await ctx.identity('CUSTOMER');
  const delivery = {
    recipientName: 'Cliente ficticio',
    phone: '55550018',
    addressLine: 'Dirección ficticia',
    city: 'Patzicía',
    region: 'Chimaltenango',
    countryCode: 'GT',
  };
  const base = { paymentMethod: 'CASH_ON_DELIVERY', delivery };
  for (const body of [
    { ...base, delivery: { ...delivery, userId: randomUUID() } },
    { ...base, total: '0.01' },
    { ...base, delivery: [delivery] },
    { ...base, paymentMethod: { $ne: 'SIMULATED' } },
    [],
  ]) {
    await client()
      .post('/api/v1/checkout/preview')
      .auth(customer.token, { type: 'bearer' })
      .send(body)
      .expect(400);
  }
  assert.equal(await ctx.prisma.order.count({ where: { customerId: customer.user.id } }), 0);
});
test('el registro rechaza rol null sin crear una cuenta por defecto', async () => {
  const email = `boundary-${randomUUID()}@example.test`;
  try {
    await client()
      .post('/api/v1/auth/register')
      .set('X-PatziShop-CSRF', '1')
      .send({ name: 'Cuenta de prueba', email, password: 'FixtureBoundary18!2026', role: null })
      .expect(400);
    assert.equal(await ctx.prisma.user.count({ where: { email } }), 0);
  } finally {
    await ctx.prisma.user.deleteMany({ where: { email } });
  }
});
