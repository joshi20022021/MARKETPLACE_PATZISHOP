import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { productContext } from './product-test-context';
import { CartsService } from '../src/carts/carts.service';
let context: Awaited<ReturnType<typeof productContext>>;
before(async () => {
  context = await productContext();
});
after(async () => {
  if (context) await context.close();
});
const client = () => request(context.app.getHttpServer());
const identity = () => context.identity('CUSTOMER');
async function product(overrides: Record<string, unknown> = {}) {
  const result = await context.prisma.product.create({
    data: {
      businessId: context.business.id,
      categoryId: context.category.id,
      name: 'Producto carrito',
      slug: `cart-${randomUUID()}`,
      description: 'Producto temporal',
      price: '0.10',
      sku: randomUUID(),
      stock: 10,
      status: 'ACTIVE',
      ...overrides,
    },
  });
  context.productIds.push(result.id);
  return result;
}
const read = (token: string) => client().get('/api/v1/cart').auth(token, { type: 'bearer' });
const add = (token: string, productId: string, quantity = 1) =>
  client().post('/api/v1/cart/items').auth(token, { type: 'bearer' }).send({ productId, quantity });
type Item = {
  id: string;
  productId: string;
  quantity: number;
  available: boolean;
  issue: string | null;
  product: Record<string, unknown> | null;
  maxQuantity: number;
  lineTotal: string | null;
};
const items = (body: { groups: { items: Item[] }[] }) =>
  body.groups.flatMap((group) => group.items);
test('carrito exige CUSTOMER, sesión válida y permiso también en el servicio', async () => {
  await client().get('/api/v1/cart').expect(401);
  const value = await product();
  const admin = await context.identity('ADMIN');
  for (const actor of [admin, context.seller]) {
    await read(actor.token).expect(403);
    await add(actor.token, value.id).expect(403);
    await client()
      .patch(`/api/v1/cart/items/${randomUUID()}`)
      .auth(actor.token, { type: 'bearer' })
      .send({ quantity: 1 })
      .expect(403);
    await client()
      .delete(`/api/v1/cart/items/${randomUUID()}`)
      .auth(actor.token, { type: 'bearer' })
      .expect(403);
    await assert.rejects(context.app.get(CartsService).read(actor.user), /clientes/);
  }
  const customer = await identity();
  await context.prisma.user.update({ where: { id: customer.user.id }, data: { isActive: false } });
  await read(customer.token).expect(401);
});
test('GET vacío no crea carrito y nunca expone identificadores del propietario', async () => {
  const customer = await identity();
  const result = await read(customer.token).expect(200);
  assert.deepEqual(result.body, {
    groups: [],
    itemCount: 0,
    quantityCount: 0,
    subtotal: '0.00',
    total: '0.00',
    hasIssues: false,
  });
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(await context.prisma.cart.count({ where: { userId: customer.user.id } }), 0);
});
test('varias tiendas conservan precios actuales, subtotales decimales y persistencia', async () => {
  const customer = await identity();
  const first = await product();
  const second = await product({ businessId: context.otherBusiness.id, price: '1.20' });
  await add(customer.token, first.id, 3).expect(201);
  const result = await add(customer.token, second.id, 2).expect(201);
  assert.equal(result.body.groups.length, 2);
  assert.equal(result.body.total, '2.70');
  assert.deepEqual(result.body.groups.map((group: { subtotal: string }) => group.subtotal).sort(), [
    '0.30',
    '2.40',
  ]);
  assert.equal(result.body.quantityCount, 5);
  const value = items(result.body)[0]!.product!;
  for (const field of ['stock', 'sku', 'ownerId', 'status']) assert.equal(value[field], undefined);
  assert.equal(
    await context.prisma.product
      .findUniqueOrThrow({ where: { id: first.id } })
      .then((value) => value.stock),
    10,
  );
  await context.prisma.product.update({ where: { id: first.id }, data: { price: '0.20' } });
  const next = await read(customer.token).expect(200);
  assert.equal(next.body.total, '3.00');
});
test('agregar incrementa una línea; PATCH reemplaza; DELETE devuelve totales actualizados', async () => {
  const customer = await identity();
  const value = await product();
  await add(customer.token, value.id, 2).expect(201);
  const result = await add(customer.token, value.id, 3).expect(201);
  assert.equal(result.body.itemCount, 1);
  const item = items(result.body)[0]!;
  assert.equal(item.quantity, 5);
  const changed = await client()
    .patch(`/api/v1/cart/items/${item.id}`)
    .auth(customer.token, { type: 'bearer' })
    .send({ quantity: 2 })
    .expect(200);
  assert.equal(changed.body.total, '0.20');
  const removed = await client()
    .delete(`/api/v1/cart/items/${item.id}`)
    .auth(customer.token, { type: 'bearer' })
    .expect(200);
  assert.equal(removed.body.itemCount, 0);
  await client()
    .delete(`/api/v1/cart/items/${item.id}`)
    .auth(customer.token, { type: 'bearer' })
    .expect(404);
});
test('stock y límite de cantidad rechazan cambios sin alterar el carrito ni inventario', async () => {
  const customer = await identity();
  const value = await product({ stock: 3 });
  const initial = await add(customer.token, value.id, 2).expect(201);
  const id = items(initial.body)[0]!.id;
  await add(customer.token, value.id, 2).expect(409);
  await client()
    .patch(`/api/v1/cart/items/${id}`)
    .auth(customer.token, { type: 'bearer' })
    .send({ quantity: 4 })
    .expect(409);
  assert.equal(items((await read(customer.token)).body)[0]!.quantity, 2);
  const abundant = await product({ stock: 1000 });
  await add(customer.token, abundant.id, 99).expect(201);
  const limit = await add(customer.token, abundant.id).expect(409);
  assert.equal(limit.body.error, 'QUANTITY_LIMIT');
  assert.equal(
    items((await read(customer.token)).body).find((item) => item.productId === abundant.id)!
      .maxQuantity,
    99,
  );
});
test('cuerpos inválidos, campos ajenos, IDs y cantidades manipuladas se rechazan', async () => {
  const customer = await identity();
  const value = await product();
  for (const quantity of [0, -1, 1.5, 100, '2', true, null, [1]])
    await add(customer.token, value.id, quantity as number).expect(400);
  for (const extra of [{ userId: randomUUID() }, { cartId: randomUUID() }, { price: '0.01' }])
    await client()
      .post('/api/v1/cart/items')
      .auth(customer.token, { type: 'bearer' })
      .send({ productId: value.id, quantity: 1, ...extra })
      .expect(400);
  await add(customer.token, 'invalid').expect(400);
  await client()
    .patch('/api/v1/cart/items/invalid')
    .auth(customer.token, { type: 'bearer' })
    .send({ quantity: 1 })
    .expect(400);
  await add(customer.token, randomUUID()).expect(409);
});
test('clientes no pueden leer ni editar líneas ajenas con UUID o userId/cartId', async () => {
  const owner = await identity();
  const outsider = await identity();
  const value = await product();
  const result = await add(owner.token, value.id).expect(201);
  const id = items(result.body)[0]!.id;
  const cart = await context.prisma.cart.findUniqueOrThrow({ where: { userId: owner.user.id } });
  const foreign = await read(outsider.token)
    .query({ userId: owner.user.id, cartId: cart.id })
    .expect(200);
  assert.equal(foreign.body.itemCount, 0);
  await client()
    .patch(`/api/v1/cart/items/${id}`)
    .auth(outsider.token, { type: 'bearer' })
    .send({ quantity: 2 })
    .expect(404);
  await client()
    .delete(`/api/v1/cart/items/${id}`)
    .auth(outsider.token, { type: 'bearer' })
    .expect(404);
  assert.equal(items((await read(owner.token)).body)[0]!.quantity, 1);
});
test('moderación y despublicación conservan una línea eliminable sin datos privados ni subtotal', async () => {
  const customer = await identity();
  const value = await product();
  const initial = await add(customer.token, value.id).expect(201);
  const id = items(initial.body)[0]!.id;
  for (const status of ['PENDING', 'SUSPENDED', 'REJECTED'] as const) {
    await context.prisma.business.update({ where: { id: context.business.id }, data: { status } });
    try {
      const snapshot = await read(customer.token).expect(200);
      assert.equal(snapshot.body.hasIssues, true);
      assert.equal(snapshot.body.total, '0.00');
      assert.equal(snapshot.body.groups[0].business, null);
      assert.equal(items(snapshot.body)[0]!.product, null);
      await add(customer.token, value.id).expect(409);
      await client()
        .patch(`/api/v1/cart/items/${id}`)
        .auth(customer.token, { type: 'bearer' })
        .send({ quantity: 1 })
        .expect(409);
    } finally {
      await context.prisma.business.update({
        where: { id: context.business.id },
        data: { status: 'ACTIVE' },
      });
    }
  }
  for (const field of ['category', 'owner', 'role', 'product', 'stock']) {
    if (field === 'category')
      await context.prisma.category.update({
        where: { id: context.category.id },
        data: { isActive: false },
      });
    if (field === 'owner')
      await context.prisma.user.update({
        where: { id: context.seller.user.id },
        data: { isActive: false },
      });
    if (field === 'role')
      await context.prisma.user.update({
        where: { id: context.seller.user.id },
        data: { role: 'CUSTOMER' },
      });
    if (field === 'product')
      await context.prisma.product.update({
        where: { id: value.id },
        data: { status: 'INACTIVE' },
      });
    if (field === 'stock')
      await context.prisma.product.update({ where: { id: value.id }, data: { stock: 0 } });
    try {
      assert.equal(items((await read(customer.token)).body)[0]!.issue, 'UNAVAILABLE');
      await add(customer.token, value.id).expect(409);
    } finally {
      await context.prisma.category.update({
        where: { id: context.category.id },
        data: { isActive: true },
      });
      await context.prisma.user.update({
        where: { id: context.seller.user.id },
        data: { isActive: true, role: 'SELLER' },
      });
      await context.prisma.product.update({
        where: { id: value.id },
        data: { status: 'ACTIVE', stock: 10 },
      });
    }
  }
  await context.prisma.product.update({ where: { id: value.id }, data: { status: 'INACTIVE' } });
  await client()
    .delete(`/api/v1/cart/items/${id}`)
    .auth(customer.token, { type: 'bearer' })
    .expect(200);
});
test('menos stock marca conflicto sin corregir cantidades silenciosamente; PATCH permite recuperarlo', async () => {
  const customer = await identity();
  const value = await product();
  const initial = await add(customer.token, value.id, 5).expect(201);
  const id = items(initial.body)[0]!.id;
  await context.prisma.product.update({ where: { id: value.id }, data: { stock: 2 } });
  const snapshot = await read(customer.token).expect(200);
  assert.equal(snapshot.body.total, '0.00');
  assert.equal(items(snapshot.body)[0]!.quantity, 5);
  assert.equal(items(snapshot.body)[0]!.maxQuantity, 2);
  assert.equal(items(snapshot.body)[0]!.issue, 'INSUFFICIENT_STOCK');
  const fixed = await client()
    .patch(`/api/v1/cart/items/${id}`)
    .auth(customer.token, { type: 'bearer' })
    .send({ quantity: 2 })
    .expect(200);
  assert.equal(fixed.body.hasIssues, false);
  assert.equal(fixed.body.total, '0.20');
});
test('agregados concurrentes al mismo carrito no pierden cantidades ni superan stock', async () => {
  const customer = await identity();
  const value = await product({ stock: 3 });
  const results = await Promise.all(Array.from({ length: 4 }, () => add(customer.token, value.id)));
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 201, 201, 409]);
  const snapshot = await read(customer.token).expect(200);
  assert.equal(snapshot.body.itemCount, 1);
  assert.equal(items(snapshot.body)[0]!.quantity, 3);
  assert.equal(await context.prisma.cart.count({ where: { userId: customer.user.id } }), 1);
});
test('límite de 50 productos distintos y cascada de producto eliminado', async () => {
  const customer = await identity();
  const values = await Promise.all(Array.from({ length: 51 }, () => product()));
  const cart = await context.prisma.cart.create({ data: { userId: customer.user.id } });
  await context.prisma.cartItem.createMany({
    data: values
      .slice(0, 50)
      .map((value) => ({ cartId: cart.id, productId: value.id, quantity: 1 })),
  });
  await add(customer.token, values[50]!.id).expect(409);
  await add(customer.token, values[0]!.id).expect(201);
  await context.prisma.product.delete({ where: { id: values[0]!.id } });
  const snapshot = await read(customer.token).expect(200);
  assert.equal(snapshot.body.itemCount, 49);
});
test('OpenAPI documenta carrito protegido, DTOs, conflictos y respuestas', async () => {
  const result = await client().get('/api/docs-json').expect(200);
  for (const operation of [
    result.body.paths['/api/v1/cart'].get,
    result.body.paths['/api/v1/cart/items'].post,
    result.body.paths['/api/v1/cart/items/{id}'].patch,
    result.body.paths['/api/v1/cart/items/{id}'].delete,
  ]) {
    assert.deepEqual(operation.security, [{ bearer: [] }]);
    assert(operation.responses['401']);
    assert(operation.responses['409']);
  }
  assert.equal(result.body.components.schemas.CartQuantityDto.properties.quantity.maximum, 99);
});
