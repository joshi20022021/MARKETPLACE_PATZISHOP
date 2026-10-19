import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { productContext } from './product-test-context';
import { PaymentService } from '../src/checkout/payment.service';
import { OrdersService } from '../src/orders/orders.service';
let context: Awaited<ReturnType<typeof productContext>>;
before(async () => {
  context = await productContext();
});
after(async () => {
  if (!context) return;
  const orders = await context.prisma.order.findMany({
    where: {
      sellerOrders: { some: { items: { some: { productId: { in: context.productIds } } } } },
    },
    select: { id: true },
  });
  context.orderIds.push(...orders.map((order) => order.id));
  await context.prisma.orderStatusHistory.deleteMany({
    where: { sellerOrder: { orderId: { in: context.orderIds } } },
  });
  await context.close();
});
const client = () => request(context.app.getHttpServer());
const input = () => ({
  delivery: {
    recipientName: 'Cliente prueba',
    phone: '55550000',
    addressLine: 'Dirección temporal de prueba',
    city: 'Patzicía',
    region: 'Chimaltenango',
    countryCode: 'GT',
    postalCode: '',
    deliveryInstructions: '',
  },
  paymentMethod: 'CASH_ON_DELIVERY' as const,
});
async function product(overrides: Record<string, unknown> = {}) {
  const value = await context.prisma.product.create({
    data: {
      businessId: context.business.id,
      categoryId: context.category.id,
      name: 'Producto pedido',
      slug: `order-${randomUUID()}`,
      description: 'Temporal',
      sku: randomUUID(),
      price: '10.10',
      stock: 5,
      status: 'ACTIVE',
      ...overrides,
    },
  });
  context.productIds.push(value.id);
  return value;
}
async function add(token: string, productId: string, quantity = 1) {
  await client()
    .post('/api/v1/cart/items')
    .auth(token, { type: 'bearer' })
    .send({ productId, quantity })
    .expect(201);
}
async function review(
  token: string,
  body: import('../src/checkout/dto/checkout-input.dto').CheckoutPreviewDto = input(),
) {
  return (
    await client()
      .post('/api/v1/checkout/preview')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(200)
  ).body.reviewVersion as string;
}
async function buyer(stock = 5) {
  const customer = await context.identity('CUSTOMER');
  const value = await product({ stock });
  await add(customer.token, value.id);
  return { ...customer, product: value };
}
const confirm = (token: string, body: object) =>
  client().post('/api/v1/orders').auth(token, { type: 'bearer' }).send(body);
const payload = (reviewVersion: string, extra: object = {}) => ({
  ...input(),
  reviewVersion,
  idempotencyKey: randomUUID(),
  ...extra,
});
test('compra divide tiendas, conserva decimales, historial inicial y descuenta stock con movimientos', async () => {
  const customer = await buyer();
  const second = await product({ businessId: context.otherBusiness.id, price: '0.10', stock: 3 });
  await add(customer.token, second.id, 3);
  const body = payload(await review(customer.token));
  const result = await confirm(customer.token, body).expect(201);
  assert.equal(result.body.total, '10.40');
  assert.equal(result.body.paymentStatus, 'PENDING');
  assert.equal(result.body.simulation, false);
  assert.equal(result.body.sellerOrders.length, 2);
  assert.equal(result.headers['cache-control'], 'no-store');
  for (const group of result.body.sellerOrders) {
    assert.equal(group.status, 'CONFIRMED');
    assert.equal(group.items.length, 1);
  }
  const movements = await context.prisma.inventoryMovement.findMany({
    where: { productId: { in: [customer.product.id, second.id] }, type: 'OUT' },
  });
  assert.equal(movements.length, 2);
  assert.equal(movements.find((value) => value.productId === second.id)!.quantity, -3);
  assert.equal(
    await context.prisma.product
      .findUniqueOrThrow({ where: { id: second.id } })
      .then((value) => value.status),
    'OUT_OF_STOCK',
  );
  assert.equal(
    await context.prisma.cartItem.count({ where: { cart: { userId: customer.user.id } } }),
    0,
  );
  const parts = await context.prisma.sellerOrder.findMany({
    where: { orderId: result.body.id },
    include: { statusHistory: true },
  });
  assert(
    parts.every(
      (value) =>
        value.stockDeductedAt &&
        value.statusHistory[0]?.toStatus === 'CONFIRMED' &&
        value.statusHistory[0].actorId === customer.user.id,
    ),
  );
  for (const field of ['customerId', 'requestHash', 'idempotencyKey'])
    assert.equal(result.body[field], undefined);
  const recovered = await client()
    .get(`/api/v1/orders/confirmation/${body.idempotencyKey}`)
    .auth(customer.token, { type: 'bearer' })
    .expect(200);
  assert.equal(recovered.body.id, result.body.id);
});
test('pago simulado confirma como PAID con señal de simulación; no registra tarjeta ni pago real', async () => {
  const customer = await buyer();
  const data = { ...input(), paymentMethod: 'SIMULATED' as const };
  const result = await confirm(customer.token, {
    ...data,
    reviewVersion: await review(customer.token, data),
    idempotencyKey: randomUUID(),
  }).expect(201);
  assert.equal(result.body.paymentMethod, 'SIMULATED');
  assert.equal(result.body.paymentStatus, 'PAID');
  assert.equal(result.body.simulation, true);
});
test('reintentos concurrentes devuelven el mismo pedido, incluso con carrito posterior o stock agotado', async () => {
  const customer = await buyer(1);
  const body = payload(await review(customer.token));
  const results = await Promise.all(Array.from({ length: 3 }, () => confirm(customer.token, body)));
  assert(results.every((value) => value.status === 201));
  assert.equal(new Set(results.map((value) => value.body.id)).size, 1);
  const next = await product();
  await add(customer.token, next.id);
  await confirm(customer.token, body).expect(201);
  assert.equal(
    await context.prisma.cartItem.count({ where: { cart: { userId: customer.user.id } } }),
    1,
  );
  assert.equal(
    await context.prisma.inventoryMovement.count({
      where: { productId: customer.product.id, type: 'OUT' },
    }),
    1,
  );
  assert.equal(await context.prisma.order.count({ where: { customerId: customer.user.id } }), 1);
});
test('clave reutilizada para otra entrega o versión se rechaza sin nueva compra', async () => {
  const customer = await buyer();
  const body = payload(await review(customer.token));
  await confirm(customer.token, body).expect(201);
  const result = await confirm(customer.token, {
    ...body,
    delivery: { ...body.delivery, addressLine: 'Otra dirección de prueba' },
  }).expect(409);
  assert.equal(result.body.error, 'IDEMPOTENCY_KEY_REUSED');
});
test('solo un comprador obtiene la última unidad y el otro conserva su carrito', async () => {
  const value = await product({ stock: 1 });
  const first = await context.identity('CUSTOMER');
  const second = await context.identity('CUSTOMER');
  await add(first.token, value.id);
  await add(second.token, value.id);
  const firstBody = payload(await review(first.token));
  const secondBody = payload(await review(second.token));
  const results = await Promise.all([
    confirm(first.token, firstBody),
    confirm(second.token, secondBody),
  ]);
  assert.deepEqual(results.map((value) => value.status).sort(), [201, 409]);
  assert.equal(
    await context.prisma.product
      .findUniqueOrThrow({ where: { id: value.id } })
      .then((product) => product.stock),
    0,
  );
  assert.equal(
    await context.prisma.inventoryMovement.count({ where: { productId: value.id, type: 'OUT' } }),
    1,
  );
  const loser = results[0]!.status === 409 ? first : second;
  assert.equal(
    await context.prisma.cartItem.count({ where: { cart: { userId: loser.user.id } } }),
    1,
  );
});
test('carritos con productos agregados en orden inverso bloquean filas de forma estable', async () => {
  const a = await product({ stock: 2 });
  const b = await product({ stock: 2 });
  const first = await context.identity('CUSTOMER');
  const second = await context.identity('CUSTOMER');
  await add(first.token, a.id);
  await add(first.token, b.id);
  await add(second.token, b.id);
  await add(second.token, a.id);
  const bodies = [payload(await review(first.token)), payload(await review(second.token))];
  const results = await Promise.all([
    confirm(first.token, bodies[0]!),
    confirm(second.token, bodies[1]!),
  ]);
  assert(results.every((result) => result.status === 201));
  assert.equal(
    await context.prisma.product.count({ where: { id: { in: [a.id, b.id] }, stock: 0 } }),
    2,
  );
});
test('fallo posterior a escribir inventario revierte pedido, líneas, historial, stock y carrito', async () => {
  const customer = await buyer();
  const body = payload(await review(customer.token));
  const payments = context.app.get(PaymentService);
  const original = payments.complete;
  payments.complete = () => {
    throw new Error('Fixture payment failure');
  };
  try {
    await confirm(customer.token, body).expect(500);
  } finally {
    payments.complete = original;
  }
  assert.equal(await context.prisma.order.count({ where: { customerId: customer.user.id } }), 0);
  assert.equal(
    await context.prisma.inventoryMovement.count({ where: { productId: customer.product.id } }),
    0,
  );
  assert.equal(
    await context.prisma.orderItem.count({ where: { productId: customer.product.id } }),
    0,
  );
  assert.equal(
    await context.prisma.product
      .findUniqueOrThrow({ where: { id: customer.product.id } })
      .then((value) => value.stock),
    5,
  );
  assert.equal(
    await context.prisma.cartItem.count({ where: { cart: { userId: customer.user.id } } }),
    1,
  );
  await confirm(customer.token, body).expect(201);
});
test('precio, nombre, cantidad y entrega modificados exigen revisión nueva sin efectos parciales', async () => {
  const customer = await buyer();
  let body = payload(await review(customer.token));
  await context.prisma.product.update({
    where: { id: customer.product.id },
    data: { price: '11.00' },
  });
  assert.equal((await confirm(customer.token, body).expect(409)).body.error, 'CHECKOUT_CHANGED');
  body = payload(await review(customer.token));
  await add(customer.token, customer.product.id);
  await confirm(customer.token, body).expect(409);
  body = payload(await review(customer.token));
  await confirm(customer.token, {
    ...body,
    delivery: { ...body.delivery, recipientName: 'Otra persona de prueba' },
  }).expect(409);
  await context.prisma.product.update({
    where: { id: customer.product.id },
    data: { name: 'Producto cambiado' },
  });
  await confirm(customer.token, body).expect(409);
  assert.equal(await context.prisma.order.count({ where: { customerId: customer.user.id } }), 0);
  assert.equal(
    await context.prisma.inventoryMovement.count({ where: { productId: customer.product.id } }),
    0,
  );
});
test('despublicación, agotado, moderación, categoría y propietario bloquean compra', async () => {
  const customer = await buyer();
  const body = payload(await review(customer.token));
  for (const field of ['product', 'stock', 'business', 'category', 'owner']) {
    if (field === 'product')
      await context.prisma.product.update({
        where: { id: customer.product.id },
        data: { status: 'INACTIVE' },
      });
    if (field === 'stock')
      await context.prisma.product.update({
        where: { id: customer.product.id },
        data: { stock: 0 },
      });
    if (field === 'business')
      await context.prisma.business.update({
        where: { id: context.business.id },
        data: { status: 'SUSPENDED' },
      });
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
    try {
      await confirm(customer.token, body).expect(409);
    } finally {
      await context.prisma.product.update({
        where: { id: customer.product.id },
        data: { status: 'ACTIVE', stock: 5 },
      });
      await context.prisma.business.update({
        where: { id: context.business.id },
        data: { status: 'ACTIVE' },
      });
      await context.prisma.category.update({
        where: { id: context.category.id },
        data: { isActive: true },
      });
      await context.prisma.user.update({
        where: { id: context.seller.user.id },
        data: { isActive: true },
      });
    }
  }
});
test('producto y entrega son snapshots históricos aunque cambie el catálogo', async () => {
  const customer = await buyer();
  const body = payload(await review(customer.token));
  const result = await confirm(customer.token, body).expect(201);
  await context.prisma.product.update({
    where: { id: customer.product.id },
    data: { name: 'Nuevo nombre', price: '99.99', sku: randomUUID() },
  });
  const history = await client()
    .get(`/api/v1/orders/${result.body.id}`)
    .auth(customer.token, { type: 'bearer' })
    .expect(200);
  assert.equal(history.body.sellerOrders[0].items[0].productName, 'Producto pedido');
  assert.equal(history.body.sellerOrders[0].items[0].unitPrice, '10.10');
  assert.equal(history.body.delivery.addressLine, body.delivery.addressLine);
  assert.equal(
    await context.prisma.orderItem
      .findFirstOrThrow({ where: { productId: customer.product.id } })
      .then((value) => value.sku),
    customer.product.sku,
  );
});
test('clientes ven solo sus pedidos y vendedores solo sus subpedidos sin total ajeno', async () => {
  const customer = await buyer();
  const other = await product({ businessId: context.otherBusiness.id });
  await add(customer.token, other.id);
  const result = await confirm(customer.token, payload(await review(customer.token))).expect(201);
  const outsider = await context.identity('CUSTOMER');
  await client()
    .get(`/api/v1/orders/${result.body.id}`)
    .auth(outsider.token, { type: 'bearer' })
    .expect(404);
  const list = await client()
    .get('/api/v1/orders')
    .auth(customer.token, { type: 'bearer' })
    .query({ userId: outsider.user.id, limit: 1 })
    .expect(400);
  assert.equal(list.body.statusCode, 400);
  const ownList = await client()
    .get('/api/v1/orders?limit=1')
    .auth(customer.token, { type: 'bearer' })
    .expect(200);
  assert.equal(ownList.body.meta.total, 1);
  const part = result.body.sellerOrders.find(
    (value: { business: { id: string } }) => value.business.id === context.business.id,
  );
  const receipt = await client()
    .get(`/api/v1/seller/orders/${part.id}`)
    .auth(context.seller.token, { type: 'bearer' })
    .expect(200);
  assert.equal(receipt.body.total, undefined);
  assert.equal(receipt.body.sellerOrders, undefined);
  assert.equal(receipt.body.items.length, 1);
  await client()
    .get(`/api/v1/seller/orders/${part.id}`)
    .auth(context.other.token, { type: 'bearer' })
    .expect(404);
  const sellerList = await client()
    .get('/api/v1/seller/orders')
    .auth(context.seller.token, { type: 'bearer' })
    .expect(200);
  assert(
    sellerList.body.data.every(
      (value: { business: { id: string } }) => value.business.id === context.business.id,
    ),
  );
});
test('rutas exigen rol, JWT y cuerpos válidos sin aceptar importes o estados del cliente', async () => {
  await client().post('/api/v1/orders').send({}).expect(401);
  const admin = await context.identity('ADMIN');
  for (const actor of [admin, context.seller]) {
    await confirm(actor.token, {}).expect(403);
    await client().get('/api/v1/orders').auth(actor.token, { type: 'bearer' }).expect(403);
  }
  const customer = await buyer();
  const body = payload(await review(customer.token));
  for (const extra of [
    { total: '0.01' },
    { customerId: randomUUID() },
    { paymentStatus: 'PAID' },
    { reviewVersion: 'invalid' },
    { idempotencyKey: 'invalid' },
    { delivery: null },
  ])
    await confirm(customer.token, { ...body, ...extra }).expect(400);
  await client().get('/api/v1/orders/invalid').auth(customer.token, { type: 'bearer' }).expect(400);
  await client().get('/api/v1/orders?page=0').auth(customer.token, { type: 'bearer' }).expect(400);
  await client().get('/api/v1/seller/orders').auth(customer.token, { type: 'bearer' }).expect(403);
  await assert.rejects(
    context.app.get(OrdersService).confirm(context.seller.user, body),
    /permiso/,
  );
});
test('totales fuera de Decimal(14,2) se rechazan de forma controlada sin descontar', async () => {
  const customer = await context.identity('CUSTOMER');
  for (let i = 0; i < 2; i++) {
    const value = await product({ price: '9999999999.99', stock: 99 });
    await add(customer.token, value.id, 99);
  }
  const result = await confirm(customer.token, payload(await review(customer.token))).expect(409);
  assert.equal(result.body.error, 'ORDER_TOTAL_LIMIT');
  assert.equal(await context.prisma.order.count({ where: { customerId: customer.user.id } }), 0);
});
test('OpenAPI documenta confirmación, lectura y recuperación privadas sin gestión de estados', async () => {
  const result = await client().get('/api/docs-json').expect(200);
  assert.deepEqual(result.body.paths['/api/v1/orders'].post.security, [{ bearer: [] }]);
  assert(result.body.paths['/api/v1/orders/confirmation/{key}'].get);
  assert(result.body.paths['/api/v1/seller/orders/{id}'].get);
  assert.equal(result.body.paths['/api/v1/orders/{id}'].patch, undefined);
});
