import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { productContext } from './product-test-context';
let context: Awaited<ReturnType<typeof productContext>>;
const base = '/api/v1/seller/products';
before(async () => {
  context = await productContext();
});
after(async () => {
  if (context) await context.close();
});
function api(
  method: 'get' | 'post' | 'patch' | 'delete',
  path = base,
  token = context.seller.token,
) {
  const client = request(context.app.getHttpServer());
  return client[method](path).set('Authorization', `Bearer ${token}`);
}
async function create(overrides: Record<string, unknown> = {}, token = context.seller.token) {
  const response = await api('post', base, token).send(context.productInput(overrides)).expect(201);
  context.productIds.push(response.body.id);
  return response.body as {
    id: string;
    name: string;
    slug: string;
    price: string;
    stock: number;
    sku: string;
    status: string;
    businessId: string;
    categoryId: string;
    description: string;
  };
}

test('seller creates an owned normalized draft with precise price and initial inventory movement', async () => {
  const product = await create({ price: '0.10' });
  assert.equal(product.businessId, context.business.id);
  assert.equal(product.name, 'Producto de prueba');
  assert.equal(product.description, 'Descripción');
  assert.equal(product.price, '0.10');
  assert.equal(product.status, 'INACTIVE');
  const movements = await context.prisma.inventoryMovement.findMany({
    where: { productId: product.id },
  });
  assert.equal(movements.length, 1);
  assert.equal(movements[0]!.quantity, 3);
  assert.equal(movements[0]!.previousStock, 0);
  const read = await api('get', `${base}/${product.id}`).expect(200);
  assert.equal(read.body.mainImage, null);
  assert.deepEqual(read.body.images, []);
  const zero = await create({ stock: undefined, status: undefined, price: '9999999999.99' });
  assert.equal(zero.stock, 0);
  assert.equal(zero.price, '9999999999.99');
});

test('all CRUD methods require SELLER and cannot access or change another shop', async () => {
  const product = await create();
  for (const [method, path] of [
    ['post', base],
    ['get', base],
    ['get', `${base}/${product.id}`],
    ['patch', `${base}/${product.id}`],
    ['delete', `${base}/${product.id}`],
  ] as const) {
    const client = request(context.app.getHttpServer());
    await client[method](path).send({}).expect(401);
    for (const role of ['CUSTOMER', 'ADMIN'] as const) {
      const identity = await context.identity(role);
      await api(method, path, identity.token).send({}).expect(403);
    }
  }
  for (const method of ['get', 'patch', 'delete'] as const) {
    const missing = await api(method, `${base}/${product.id}`, context.other.token)
      .send({ name: 'Foreign change' })
      .expect(404);
    assert.equal(missing.body.error, 'RESOURCE_NOT_FOUND');
  }
  await api('patch', `${base}/${product.id}`)
    .send({ businessId: context.otherBusiness.id })
    .expect(400);
  assert.equal((await api('get').query({ search: product.slug }).expect(200)).body.meta.total, 0);
  const foreignList = await api('get', base, context.other.token).expect(200);
  assert(!foreignList.body.data.some((row: { id: string }) => row.id === product.id));
  assert.equal(
    (
      await api('get', `${base}/${product.id}`)
        .query({ businessId: context.otherBusiness.id })
        .expect(200)
    ).body.businessId,
    context.business.id,
  );
});

test('invalid fields, decimals, stock, status and external images are rejected', async () => {
  for (const overrides of [
    { price: 10.1 },
    { price: '-1' },
    { price: '1.001' },
    { price: '1e2' },
    { price: '10000000000' },
    { price: '01.10' },
    { price: null },
    { stock: -1 },
    { stock: 1.5 },
    { stock: '1' },
    { stock: 2147483648 },
    { stock: null },
    { status: null },
    { categoryId: 'invalid' },
    { name: 'x' },
    { name: null },
    { slug: 'bad--slug' },
    { description: null },
    { description: 'x'.repeat(10001) },
    { sku: '' },
    { businessId: context.business.id },
    { mainImage: 'https://example.test/image.png' },
    { images: [] },
    { id: randomUUID() },
  ])
    await api('post').send(context.productInput(overrides)).expect(400);
  const row = await create();
  for (const changes of [
    { stock: null },
    { price: null },
    { name: null },
    { categoryId: null },
    { status: null },
  ])
    await api('patch', `${base}/${row.id}`).send(changes).expect(400);
  const empty = await api('patch', `${base}/${row.id}`).send({}).expect(400);
  assert.equal(empty.body.error, 'EMPTY_UPDATE');
});

test('categories must exist and be active; inactive products can still be disabled or edited', async () => {
  await api('post')
    .send(context.productInput({ categoryId: randomUUID() }))
    .expect(409);
  const category = await context.prisma.category.create({
    data: { ...context.input(), isActive: false },
  });
  await api('post')
    .send(context.productInput({ categoryId: category.id }))
    .expect(409);
  const product = await create({ status: 'ACTIVE' });
  await context.prisma.category.update({
    where: { id: context.category.id },
    data: { isActive: false },
  });
  await api('patch', `${base}/${product.id}`).send({ name: 'Cannot stay active' }).expect(409);
  await api('patch', `${base}/${product.id}`)
    .send({ status: 'INACTIVE', name: 'Disabled product' })
    .expect(200);
  await api('patch', `${base}/${product.id}`).send({ description: '' }).expect(200);
  await context.prisma.category.update({
    where: { id: context.category.id },
    data: { isActive: true },
  });
});

test('pending shops can prepare drafts; suspended/rejected shops cannot write; publication requires approval', async () => {
  await context.prisma.business.update({
    where: { id: context.business.id },
    data: { status: 'PENDING' },
  });
  const draft = await create();
  const active = await api('patch', `${base}/${draft.id}`).send({ status: 'ACTIVE' }).expect(409);
  assert.equal(active.body.error, 'PUBLICATION_NOT_ALLOWED');
  for (const status of ['SUSPENDED', 'REJECTED'] as const) {
    await context.prisma.business.update({ where: { id: context.business.id }, data: { status } });
    await api('post').send(context.productInput()).expect(403);
    await api('patch', `${base}/${draft.id}`).send({ name: 'Blocked change' }).expect(403);
    await api('delete', `${base}/${draft.id}`).expect(403);
    await api('get', `${base}/${draft.id}`).expect(200);
  }
  await context.prisma.business.update({
    where: { id: context.business.id },
    data: { status: 'ACTIVE' },
  });
});

test('stock transitions and concurrent adjustments serialize with consistent inventory history', async () => {
  const product = await create({ status: 'ACTIVE', stock: 2 });
  const out = await api('patch', `${base}/${product.id}`).send({ stock: 0 }).expect(200);
  assert.equal(out.body.status, 'OUT_OF_STOCK');
  const replenished = await api('patch', `${base}/${product.id}`).send({ stock: 5 }).expect(200);
  assert.equal(replenished.body.status, 'ACTIVE');
  await api('patch', `${base}/${product.id}`).send({ status: 'OUT_OF_STOCK' }).expect(409);
  await Promise.all([
    api('patch', `${base}/${product.id}`).send({ stock: 7 }).expect(200),
    api('patch', `${base}/${product.id}`).send({ stock: 9 }).expect(200),
  ]);
  const movements = await context.prisma.inventoryMovement.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: 'asc' },
  });
  assert.equal(movements.length, 5);
  // Transaction start timestamps do not establish the order of concurrent row-lock acquisitions.
  const remaining = [...movements];
  let balance = 0;
  while (remaining.length) {
    const index = remaining.findIndex((movement) => movement.previousStock === balance);
    assert(index >= 0, 'inventory adjustments must form a continuous balance chain');
    const movement = remaining.splice(index, 1)[0]!;
    assert.equal(movement.previousStock + movement.quantity, movement.newStock);
    balance = movement.newStock;
  }
  const current = await api('get', `${base}/${product.id}`).expect(200);
  assert.equal(current.body.stock, balance);
  const inactive = await create({ stock: 0 });
  assert.equal(
    (await api('patch', `${base}/${inactive.id}`).send({ stock: 10 }).expect(200)).body.status,
    'INACTIVE',
  );
});

test('slug uniqueness is global, SKU uniqueness per shop and conflicts do not partially change stock', async () => {
  const first = await create();
  const second = await create();
  const input = context.productInput({ slug: first.slug });
  await api('post').send(input).expect(409);
  await api('post')
    .send(context.productInput({ sku: first.sku }))
    .expect(409);
  await create({ sku: first.sku }, context.other.token);
  await api('patch', `${base}/${second.id}`)
    .send({ sku: first.sku, stock: 99, name: 'Should roll back' })
    .expect(409);
  const unchanged = await api('get', `${base}/${second.id}`).expect(200);
  assert.equal(unchanged.body.stock, 3);
  assert.equal(unchanged.body.name, second.name);
  assert.equal(
    await context.prisma.inventoryMovement.count({ where: { productId: second.id } }),
    1,
  );
  const data = context.productInput();
  const responses = await Promise.all([api('post').send(data), api('post').send(data)]);
  for (const response of responses)
    if (response.status === 201) context.productIds.push(response.body.id);
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
});

test('seller list is scoped, paginated and validates all filters', async () => {
  const marker = `List${randomUUID()}`;
  const first = await create({ name: `${marker} one`, sku: `${marker}50%_\\` });
  await create({ name: `${marker} two`, status: 'ACTIVE' });
  await create({ name: `${marker} other` }, context.other.token);
  const response = await api('get').query({ search: marker, limit: 1 }).expect(200);
  assert.equal(response.body.meta.total, 2);
  assert.equal(response.body.meta.totalPages, 2);
  const page2 = await api('get').query({ search: marker, limit: 1, page: 2 }).expect(200);
  assert.notEqual(page2.body.data[0].id, response.body.data[0].id);
  assert.equal(
    (
      await api('get')
        .query({ search: `${marker}50%_\\` })
        .expect(200)
    ).body.data[0].id,
    first.id,
  );
  assert.equal(
    (
      await api('get')
        .query({ search: marker, status: 'ACTIVE', categoryId: context.category.id })
        .expect(200)
    ).body.meta.total,
    1,
  );
  for (const query of [
    { businessId: context.business.id },
    { ownerId: context.seller.user.id },
    { page: 0 },
    { limit: 51 },
    { page: '1.1' },
    { status: 'PENDING' },
    { categoryId: 'bad' },
    { page: ['1', '2'] },
  ])
    await api('get').query(query).expect(400);
});

test('deletion removes unused product and manual movements, but preserves ordered products atomically', async () => {
  const unused = await create();
  await api('delete', `${base}/${unused.id}`).expect(204);
  await api('get', `${base}/${unused.id}`).expect(404);
  assert.equal(
    await context.prisma.inventoryMovement.count({ where: { productId: unused.id } }),
    0,
  );
  const product = await create();
  const customer = await context.identity('CUSTOMER');
  const order = await context.prisma.order.create({
    data: {
      customerId: customer.user.id,
      total: '10.10',
      paymentMethod: 'CASH_ON_DELIVERY',
      recipientName: 'Test',
      phone: '55550000',
      addressLine: 'Test address',
      city: 'Test',
      region: 'Test',
    },
  });
  context.orderIds.push(order.id);
  const sellerOrder = await context.prisma.sellerOrder.create({
    data: { orderId: order.id, businessId: context.business.id, subtotal: '10.10' },
  });
  await context.prisma.orderItem.create({
    data: {
      sellerOrderId: sellerOrder.id,
      businessId: context.business.id,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPrice: '10.10',
      quantity: 1,
      lineTotal: '10.10',
    },
  });
  const blocked = await api('delete', `${base}/${product.id}`).expect(409);
  assert.equal(blocked.body.error, 'PRODUCT_IN_USE');
  await api('get', `${base}/${product.id}`).expect(200);
  assert.equal(
    await context.prisma.inventoryMovement.count({ where: { productId: product.id } }),
    1,
  );
});

test('invalid IDs return 400, missing IDs return 404 and Swagger describes decimal strings and CRUD', async () => {
  for (const method of ['get', 'patch', 'delete'] as const) {
    await api(method, `${base}/bad-id`).send({ name: 'Valid name' }).expect(400);
    await api(method, `${base}/${randomUUID()}`).send({ name: 'Valid name' }).expect(404);
  }
  const swagger = await request(context.app.getHttpServer()).get('/api/docs-json').expect(200);
  assert(
    swagger.body.paths[base].post.security.some(
      (value: Record<string, unknown>) => 'bearer' in value,
    ),
  );
  assert(swagger.body.paths[`${base}/{id}`].delete.responses['204']);
  assert.equal(swagger.body.components.schemas.ProductResponse.properties.price.type, 'string');
  assert(!swagger.body.components.schemas.UpdateProductDto.properties.businessId);
});
