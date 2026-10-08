import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import type { Business } from '../src/generated/prisma/client';
import { businessContext, businessInput } from './business-test-context';

let context: Awaited<ReturnType<typeof businessContext>>;
const marker = `Public${randomUUID()}`;
const active: Business[] = [];
const hidden: Business[] = [];
before(async () => {
  context = await businessContext();
  for (const index of [0, 1, 2]) {
    const owner = await context.identity();
    active.push(
      await context.prisma.business.create({
        data: {
          ...businessInput(),
          ownerId: owner.user.id,
          status: 'ACTIVE',
          name: `${marker} Activa ${index}`,
          description: index === 0 ? `${marker} 50%_\\ especiales` : `${marker} catálogo normal`,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      }),
    );
  }
  for (const status of ['PENDING', 'SUSPENDED', 'REJECTED'] as const) {
    const owner = await context.identity();
    hidden.push(
      await context.prisma.business.create({
        data: { ...businessInput(), ownerId: owner.user.id, status, name: `${marker} Oculta` },
      }),
    );
  }
  const inactive = await context.identity();
  await context.prisma.user.update({ where: { id: inactive.user.id }, data: { isActive: false } });
  hidden.push(
    await context.prisma.business.create({
      data: {
        ...businessInput(),
        ownerId: inactive.user.id,
        status: 'ACTIVE',
        name: `${marker} Inactiva`,
      },
    }),
  );
  const differentRole = await context.identity('CUSTOMER');
  hidden.push(
    await context.prisma.business.create({
      data: {
        ...businessInput(),
        ownerId: differentRole.user.id,
        status: 'ACTIVE',
        name: `${marker} Rol cambiado`,
      },
    }),
  );
});
after(async () => {
  if (context) await context.close();
});
const list = () => request(context.app.getHttpServer()).get('/api/v1/businesses');
const detail = (slug: string) =>
  request(context.app.getHttpServer()).get(`/api/v1/businesses/${slug}`);

test('listado público filtra estados y propietarios inactivos sin exponer identidad interna', async () => {
  const response = await list().query({ search: marker }).expect(200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.meta, { page: 1, limit: 12, total: 3, totalPages: 1 });
  assert.deepEqual(
    response.body.data.map((business: { id: string }) => business.id).sort(),
    active.map((business) => business.id).sort(),
  );
  for (const business of response.body.data) {
    assert.deepEqual(Object.keys(business).sort(), [
      'address',
      'banner',
      'description',
      'email',
      'id',
      'logo',
      'name',
      'phone',
      'slug',
    ]);
    assert.equal(business.ownerId, undefined);
    assert.equal(business.owner, undefined);
    assert.equal(business.status, undefined);
  }
});

test('detalle permite invitados solo para tienda visible y oculta todos los demás casos con 404', async () => {
  const shown = await detail(active[0]!.slug).expect(200);
  assert.equal(shown.body.id, active[0]!.id);
  assert.equal(shown.body.ownerId, undefined);
  for (const business of hidden) {
    const response = await detail(business.slug).expect(404);
    assert.equal(response.body.error, 'RESOURCE_NOT_FOUND');
  }
  const missing = await detail(`missing-${randomUUID()}`).expect(404);
  assert.equal(missing.body.error, 'RESOURCE_NOT_FOUND');
  await detail(active[0]!.slug.toUpperCase()).expect(404);
});

test('paginación acotada usa orden estable con desempate por ID y página vacía coherente', async () => {
  const ids: string[] = [];
  for (const page of [1, 2, 3]) {
    const response = await list().query({ search: marker, page, limit: 1 }).expect(200);
    assert.deepEqual(response.body.meta, { page, limit: 1, total: 3, totalPages: 3 });
    assert.equal(response.body.data.length, 1);
    ids.push(response.body.data[0].id);
  }
  assert.deepEqual(
    ids,
    active
      .map((business) => business.id)
      .sort()
      .reverse(),
  );
  const empty = await list().query({ search: marker, page: 4, limit: 1 }).expect(200);
  assert.deepEqual(empty.body.data, []);
  assert.equal(empty.body.meta.total, 3);
  const noResults = await list()
    .query({ search: `missing-${randomUUID()}` })
    .expect(200);
  assert.equal(noResults.body.meta.totalPages, 0);
});

test('búsqueda es insensible a mayúsculas y trata metacaracteres LIKE como literales', async () => {
  assert.equal(
    (await list().query({ search: marker.toLowerCase() }).expect(200)).body.meta.total,
    3,
  );
  assert.equal(
    (
      await list()
        .query({ search: `${marker}%` })
        .expect(200)
    ).body.meta.total,
    0,
  );
  assert.equal(
    (
      await list()
        .query({ search: `${marker}_` })
        .expect(200)
    ).body.meta.total,
    0,
  );
  const special = await list()
    .query({ search: `${marker} 50%_\\` })
    .expect(200);
  assert.equal(special.body.meta.total, 1);
  assert.equal(special.body.data[0].id, active[0]!.id);
});

test('query rechaza cuotas inválidas, arreglos y campos que intentan alterar visibilidad', async () => {
  for (const query of [
    { page: 0 },
    { page: 10001 },
    { page: '1.5' },
    { limit: 0 },
    { limit: 51 },
    { limit: '1e1' },
    { page: ' 1' },
    { limit: [1, 2] },
    { status: 'PENDING' },
    { ownerId: randomUUID() },
    { search: 'x'.repeat(121) },
  ])
    await list().query(query).expect(400);
});

test('cambio de slug y suspensión se reflejan inmediatamente en la consulta pública', async () => {
  const business = active[0]!;
  const newSlug = `renamed-${randomUUID()}`;
  await context.prisma.business.update({ where: { id: business.id }, data: { slug: newSlug } });
  await detail(business.slug).expect(404);
  await detail(newSlug).expect(200);
  await context.prisma.business.update({
    where: { id: business.id },
    data: { status: 'SUSPENDED' },
  });
  await detail(newSlug).expect(404);
  assert.equal((await list().query({ search: marker }).expect(200)).body.meta.total, 2);
});

test('OpenAPI documenta rutas públicas, bearer del vendedor y campos anulables de edición', async () => {
  const response = await request(context.app.getHttpServer()).get('/api/docs-json').expect(200);
  const paths = response.body.paths;
  assert(paths['/api/v1/businesses'].get);
  assert(paths['/api/v1/businesses/{slug}'].get);
  assert(
    paths['/api/v1/seller/business'].post.security.some(
      (value: Record<string, unknown>) => 'bearer' in value,
    ),
  );
  assert(
    paths['/api/v1/seller/business'].post.responses['201'].content[
      'application/json'
    ].schema.$ref.endsWith('/SellerBusinessResponse'),
  );
  const schema = response.body.components.schemas.UpdateBusinessDto;
  assert(!schema.required || schema.required.length === 0);
  assert.equal(schema.properties.logo.nullable, true);
  assert(!schema.properties.ownerId);
  assert(!schema.properties.status);
});
