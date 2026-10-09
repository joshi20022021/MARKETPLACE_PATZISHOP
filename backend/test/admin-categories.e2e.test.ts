import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { businessInput } from './business-test-context';
import { categoryContext } from './category-test-context';

let context: Awaited<ReturnType<typeof categoryContext>>;
let admin: Awaited<ReturnType<typeof context.identity>>;
const base = '/api/v1/admin/categories';
before(async () => {
  context = await categoryContext();
  admin = await context.identity('ADMIN');
});
after(async () => {
  if (context) await context.close();
});
function api(method: 'get' | 'post' | 'patch' | 'delete', path = base, token = admin.token) {
  const client = request(context.app.getHttpServer());
  return client[method](path).set('Authorization', `Bearer ${token}`);
}
async function create(overrides: Record<string, unknown> = {}) {
  const response = await api('post').send(context.input(overrides)).expect(201);
  return response.body as {
    id: string;
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
    parentId: string | null;
  };
}

test('ADMIN creates and reads a normalized flat category with explicit defaults', async () => {
  const data = context.input();
  const created = await api('post')
    .send({ ...data, slug: ` ${data.slug.toUpperCase()} `, description: undefined })
    .expect(201);
  assert.equal(created.body.name, 'Categoría prueba');
  assert.equal(created.body.slug, data.slug);
  assert.equal(created.body.description, '');
  assert.equal(created.body.isActive, true);
  assert.equal(created.body.parentId, null);
  const own = await api('get', `${base}/${created.body.id}`).expect(200);
  assert.deepEqual(own.body, created.body);
});

test('all administrative operations require a live ADMIN identity', async () => {
  const category = await create();
  for (const [method, path] of [
    ['get', base],
    ['post', base],
    ['get', `${base}/${category.id}`],
    ['patch', `${base}/${category.id}`],
  ] as const) {
    const client = request(context.app.getHttpServer());
    await client[method](path).send({}).expect(401);
    for (const role of ['SELLER', 'CUSTOMER'] as const) {
      const identity = await context.identity(role);
      const denied = await api(method, path, identity.token).send({}).expect(403);
      assert.equal(denied.body.error, 'ROLE_FORBIDDEN');
    }
  }
  const changing = await context.identity('ADMIN');
  await context.prisma.user.update({ where: { id: changing.user.id }, data: { role: 'SELLER' } });
  await api('get', base, changing.token).expect(403);
  await context.prisma.user.update({
    where: { id: changing.user.id },
    data: { role: 'ADMIN', isActive: false },
  });
  await api('get', base, changing.token).expect(401);
});

test('invalid DTOs, privileged fields and hierarchy are rejected without creating rows', async () => {
  const data = context.input();
  for (const changes of [
    { name: ' ' },
    { name: 'x'.repeat(81) },
    { slug: 'a' },
    { slug: 'bad--slug' },
    { slug: 'categoría' },
    { description: 'x'.repeat(3001) },
    { description: null },
    { name: null },
    { slug: null },
    { isActive: 'false' },
    { isActive: 0 },
    { isActive: null },
    { parentId: randomUUID() },
    { parentId: null },
    { id: randomUUID() },
    { createdAt: new Date().toISOString() },
    { ownerId: randomUUID() },
  ]) {
    await api('post')
      .send({ ...data, ...changes })
      .expect(400);
  }
  assert.equal(await context.prisma.category.count({ where: { slug: data.slug } }), 0);
});

test('partial edits preserve omitted fields and activation can be reversed', async () => {
  const category = await create({ isActive: false });
  const renamed = await api('patch', `${base}/${category.id}`)
    .send({ name: ' Nuevo nombre ' })
    .expect(200);
  assert.equal(renamed.body.name, 'Nuevo nombre');
  assert.equal(renamed.body.slug, category.slug);
  assert.equal(renamed.body.description, category.description);
  assert.equal(renamed.body.isActive, false);
  const activated = await api('patch', `${base}/${category.id}`)
    .send({ isActive: true, description: '' })
    .expect(200);
  assert.equal(activated.body.isActive, true);
  assert.equal(activated.body.description, '');
  const empty = await api('patch', `${base}/${category.id}`).send({}).expect(400);
  assert.equal(empty.body.error, 'EMPTY_UPDATE');
  for (const changes of [
    { name: null },
    { slug: null },
    { description: null },
    { isActive: null },
    { isActive: 'true' },
    { parentId: category.id },
  ]) {
    await api('patch', `${base}/${category.id}`).send(changes).expect(400);
  }
});

test('malformed UUIDs produce 400 and missing UUIDs produce a safe 404', async () => {
  for (const method of ['get', 'patch'] as const) {
    await api(method, `${base}/invalid-uuid`).send({ name: 'Valid name' }).expect(400);
    const missing = await api(method, `${base}/${randomUUID()}`)
      .send({ name: 'Valid name' })
      .expect(404);
    assert.equal(missing.body.error, 'RESOURCE_NOT_FOUND');
  }
});

test('concurrent duplicate creation yields one category and one safe slug conflict', async () => {
  const data = context.input();
  const responses = await Promise.all([api('post').send(data), api('post').send(data)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
  assert.equal(
    responses.find((response) => response.status === 409)?.body.error,
    'CATEGORY_SLUG_UNAVAILABLE',
  );
  assert.equal(await context.prisma.category.count({ where: { slug: data.slug } }), 1);
});

test('slug collisions roll back the entire edit; concurrent renames keep uniqueness', async () => {
  const first = await create();
  const second = await create();
  const conflict = await api('patch', `${base}/${second.id}`)
    .send({ slug: first.slug, name: 'Should not persist', isActive: false })
    .expect(409);
  assert.equal(conflict.body.error, 'CATEGORY_SLUG_UNAVAILABLE');
  const unchanged = await api('get', `${base}/${second.id}`).expect(200);
  assert.equal(unchanged.body.name, second.name);
  assert.equal(unchanged.body.isActive, true);
  const target = context.input().slug;
  const results = await Promise.all([
    api('patch', `${base}/${first.id}`).send({ slug: target }),
    api('patch', `${base}/${second.id}`).send({ slug: target }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
});

test('administrative listing paginates deterministically and filters strict booleans', async () => {
  const marker = `Admin${randomUUID()}`;
  const a = await create({ name: `${marker} Same`, isActive: true });
  const b = await create({ name: `${marker} Same`, isActive: true });
  const hidden = await create({ name: `${marker} Hidden`, isActive: false });
  const all = await api('get').query({ search: marker }).expect(200);
  assert.equal(all.body.meta.total, 3);
  const visible = await api('get')
    .query({ search: marker, isActive: 'true', limit: 1 })
    .expect(200);
  assert.equal(visible.body.meta.total, 2);
  assert.equal(visible.body.meta.totalPages, 2);
  assert.equal(visible.body.data[0].id, [a.id, b.id].sort()[0]);
  const inactive = await api('get').query({ search: marker, isActive: 'false' }).expect(200);
  assert.deepEqual(
    inactive.body.data.map((row: { id: string }) => row.id),
    [hidden.id],
  );
  for (const query of [
    { isActive: '0' },
    { isActive: '' },
    { page: '1.5' },
    { limit: 51 },
    { page: ['1', '2'] },
    { parentId: a.id },
    { limit: 0 },
    { search: 'x'.repeat(121) },
  ])
    await api('get').query(query).expect(400);
  const beyond = await api('get').query({ search: marker, page: 10, limit: 1 }).expect(200);
  assert.equal(beyond.body.data.length, 0);
  assert.equal(beyond.body.meta.total, 3);
});

test('deactivation preserves product references and there is no destructive delete endpoint', async () => {
  const category = await create();
  const owner = await context.identity();
  const business = await context.prisma.business.create({
    data: { ...businessInput(), ownerId: owner.user.id },
  });
  const product = await context.prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: category.id,
      name: 'Referenced product',
      slug: `product-${randomUUID()}`,
      description: '',
      price: '10.00',
      stock: 1,
      sku: randomUUID(),
    },
  });
  context.productIds.push(product.id);
  await api('patch', `${base}/${category.id}`).send({ isActive: false }).expect(200);
  assert.equal(
    (await context.prisma.product.findUniqueOrThrow({ where: { id: product.id } })).categoryId,
    category.id,
  );
  await api('delete', `${base}/${category.id}`).expect(404);
});
