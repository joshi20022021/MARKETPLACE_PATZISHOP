import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { businessContext, businessInput } from './business-test-context';

let context: Awaited<ReturnType<typeof businessContext>>;
before(async () => {
  context = await businessContext();
});
after(async () => {
  if (context) await context.close();
});
const path = '/api/v1/seller/business';
const post = (token: string) =>
  request(context.app.getHttpServer()).post(path).auth(token, { type: 'bearer' });
const get = (token: string) =>
  request(context.app.getHttpServer()).get(path).auth(token, { type: 'bearer' });
const patch = (token: string) =>
  request(context.app.getHttpServer()).patch(path).auth(token, { type: 'bearer' });

test('SELLER crea una tienda PENDING con identidad del JWT y datos normalizados', async () => {
  const owner = await context.identity();
  const input = businessInput();
  const created = await post(owner.token)
    .send({ ...input, slug: ` ${input.slug.toUpperCase()} ` })
    .expect(201);
  assert.equal(created.body.ownerId, owner.user.id);
  assert.equal(created.body.status, 'PENDING');
  assert.equal(created.body.name, 'Tienda Patzi');
  assert.equal(created.body.slug, input.slug);
  assert.equal(created.body.email, 'comercio@example.test');
  assert.equal(created.body.address, 'Zona 1, Patzicía');
  assert.equal(created.body.description, 'Tienda de prueba');
  assert.equal(created.body.logo, null);
  assert.equal(created.body.owner, undefined);
  assert(created.body.createdAt);
  assert.deepEqual((await get(owner.token).expect(200)).body, created.body);
});

test('GET y PATCH sin tienda devuelven 404; invitados y roles incorrectos se rechazan', async () => {
  const owner = await context.identity();
  await get(owner.token).expect(404);
  await patch(owner.token).send({ name: 'Nombre válido' }).expect(404);
  for (const method of ['get', 'post', 'patch'] as const) {
    const client = request(context.app.getHttpServer());
    await client[method](path)
      .send(method === 'get' ? undefined : businessInput())
      .expect(401);
    for (const role of ['CUSTOMER', 'ADMIN'] as const) {
      const identity = await context.identity(role);
      await client[method](path)
        .auth(identity.token, { type: 'bearer' })
        .send(method === 'get' ? undefined : businessInput())
        .expect(403);
    }
  }
});

test('unicidad de propietario y slug se cumple incluso con creaciones concurrentes', async () => {
  const owner = await context.identity();
  const results = await Promise.all([
    post(owner.token).send(businessInput()),
    post(owner.token).send(businessInput()),
  ]);
  assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
  assert.equal(
    results.find((response) => response.status === 409)!.body.error,
    'BUSINESS_ALREADY_EXISTS',
  );
  const first = await context.identity();
  const second = await context.identity();
  const input = businessInput();
  const sameSlug = await Promise.all([
    post(first.token).send(input),
    post(second.token).send(input),
  ]);
  assert.deepEqual(sameSlug.map((response) => response.status).sort(), [201, 409]);
  assert.equal(
    sameSlug.find((response) => response.status === 409)!.body.error,
    'BUSINESS_SLUG_UNAVAILABLE',
  );
});

test('PATCH cambia solo campos enviados, permite borrar imágenes y rechaza cambios privilegiados', async () => {
  const owner = await context.identity();
  const first = await post(owner.token)
    .send({
      ...businessInput(),
      logo: 'https://images.example.test/logo.png',
      banner: 'https://images.example.test/banner.png',
    })
    .expect(201);
  const edited = await patch(owner.token)
    .send({ name: ' Nuevo nombre ', logo: null, description: '' })
    .expect(200);
  assert.equal(edited.body.name, 'Nuevo nombre');
  assert.equal(edited.body.logo, null);
  assert.equal(edited.body.description, '');
  assert.equal(edited.body.banner, first.body.banner);
  assert.equal(edited.body.slug, first.body.slug);
  assert.equal(edited.body.ownerId, owner.user.id);
  assert.equal(edited.body.status, 'PENDING');
  for (const data of [
    { status: 'ACTIVE' },
    { ownerId: randomUUID() },
    { id: randomUUID() },
    { createdAt: new Date().toISOString() },
  ])
    await patch(owner.token).send(data).expect(400);
  const empty = await patch(owner.token).send({}).expect(400);
  assert.equal(empty.body.error, 'EMPTY_UPDATE');
});

test('validación rechaza datos inválidos y null en campos no anulables de registro y edición', async () => {
  const owner = await context.identity();
  for (const extra of [
    { ownerId: randomUUID() },
    { status: 'ACTIVE' },
    { name: ' ' },
    { name: null },
    { description: null },
    { slug: 'invalid slug' },
    { slug: 'dos--guiones' },
    { email: 'bad' },
    { phone: 'abc12345' },
    { address: 'x' },
    { logo: 'javascript:alert(1)' },
    { banner: 'https://user:password@example.test/image' },
  ]) {
    await post(owner.token)
      .send({ ...businessInput(), ...extra })
      .expect(400);
  }
  await post(owner.token).send(businessInput()).expect(201);
  for (const extra of [
    { name: null },
    { slug: null },
    { description: null },
    { email: null },
    { phone: null },
    { address: null },
    { logo: '' },
    { banner: 'data:image/png;base64,AAAA' },
  ])
    await patch(owner.token).send(extra).expect(400);
});

test('otro vendedor no puede seleccionar ni editar una tienda ajena manipulando IDs', async () => {
  const first = await context.identity();
  const second = await context.identity();
  const created = await post(first.token).send(businessInput()).expect(201);
  await get(second.token)
    .query({ ownerId: first.user.id, businessId: created.body.id })
    .expect(404);
  await patch(second.token).send({ name: 'Intento ajeno', ownerId: first.user.id }).expect(400);
  await patch(second.token)
    .query({ ownerId: first.user.id, businessId: created.body.id })
    .send({ name: 'Intento ajeno' })
    .expect(404);
  await request(context.app.getHttpServer())
    .patch(`${path}/${created.body.id}`)
    .auth(second.token, { type: 'bearer' })
    .send({ name: 'Intento ajeno' })
    .expect(404);
  assert.equal((await get(first.token).expect(200)).body.name, 'Tienda Patzi');
});

test('cambiar slug a uno ocupado devuelve 409 y conserva todos los datos previos', async () => {
  const first = await context.identity();
  const second = await context.identity();
  const a = await post(first.token).send(businessInput()).expect(201);
  const b = await post(second.token).send(businessInput()).expect(201);
  const failed = await patch(second.token)
    .send({ slug: a.body.slug, name: 'Cambio que debe revertirse' })
    .expect(409);
  assert.equal(failed.body.error, 'BUSINESS_SLUG_UNAVAILABLE');
  assert.deepEqual((await get(second.token).expect(200)).body, b.body);
});

test('estado de moderación permanece inalterado y desactivar al vendedor invalida el acceso', async () => {
  const owner = await context.identity();
  const first = await post(owner.token).send(businessInput()).expect(201);
  await context.prisma.business.update({
    where: { id: first.body.id },
    data: { status: 'SUSPENDED' },
  });
  assert.equal(
    (await patch(owner.token).send({ phone: '5555-1234' }).expect(200)).body.status,
    'SUSPENDED',
  );
  await context.prisma.user.update({ where: { id: owner.user.id }, data: { isActive: false } });
  await get(owner.token).expect(401);
  await patch(owner.token).send({ name: 'Otro nombre' }).expect(401);
});
