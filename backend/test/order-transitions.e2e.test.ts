import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { productContext } from './product-test-context';
import { OrderTransitionsService } from '../src/orders/order-transitions.service';
let ctx: Awaited<ReturnType<typeof productContext>>;
before(async () => {
  ctx = await productContext();
});
after(async () => {
  if (!ctx) return;
  await ctx.prisma.orderStatusHistory.deleteMany({
    where: { sellerOrder: { orderId: { in: ctx.orderIds } } },
  });
  await ctx.close();
});
const client = () => request(ctx.app.getHttpServer());
const delivery = {
  recipientName: 'Cliente ficticio',
  phone: '55550000',
  addressLine: 'Dirección ficticia temporal',
  city: 'Patzicía',
  region: 'Chimaltenango',
  countryCode: 'GT',
};
async function product(stock = 3, businessId = ctx.business.id) {
  const p = await ctx.prisma.product.create({
    data: {
      ...ctx.productInput(),
      name: 'Producto de estados',
      stock,
      businessId,
      status: 'ACTIVE',
    },
  });
  ctx.productIds.push(p.id);
  return p;
}
async function purchase(stock = 3, twoStores = false, twoItems = false, simulated = false) {
  const buyer = await ctx.identity('CUSTOMER');
  const p = await product(stock);
  const ps = [p];
  if (twoStores || twoItems)
    ps.push(await product(3, twoStores ? ctx.otherBusiness.id : ctx.business.id));
  for (const [index, value] of ps.entries())
    await client()
      .post('/api/v1/cart/items')
      .auth(buyer.token, { type: 'bearer' })
      .send({ productId: value.id, quantity: index ? 1 : 2 })
      .expect(201);
  const input = { delivery, paymentMethod: simulated ? 'SIMULATED' : 'CASH_ON_DELIVERY' };
  const preview = (
    await client()
      .post('/api/v1/checkout/preview')
      .auth(buyer.token, { type: 'bearer' })
      .send(input)
      .expect(200)
  ).body;
  const order = (
    await client()
      .post('/api/v1/orders')
      .auth(buyer.token, { type: 'bearer' })
      .send({ ...input, reviewVersion: preview.reviewVersion, idempotencyKey: randomUUID() })
      .expect(201)
  ).body;
  ctx.orderIds.push(order.id);
  const part = await ctx.prisma.sellerOrder.findFirstOrThrow({
    where: { orderId: order.id, businessId: ctx.business.id },
  });
  return { buyer, ps, order, part };
}
const change = (token: string, id: string, expectedStatus: string, status: string, note = '') =>
  client()
    .patch(`/api/v1/seller/orders/${id}/status`)
    .auth(token, { type: 'bearer' })
    .send({ expectedStatus, status, note });
const cancel = (token: string, id: string, expectedStatus = 'CONFIRMED', note = '') =>
  client()
    .patch(`/api/v1/orders/seller-orders/${id}/cancel`)
    .auth(token, { type: 'bearer' })
    .send({ expectedStatus, note });
async function pending(p: Awaited<ReturnType<typeof product>>) {
  const buyer = await ctx.identity('CUSTOMER');
  const order = await ctx.prisma.order.create({
    data: {
      customerId: buyer.user.id,
      total: p.price,
      paymentMethod: 'CASH_ON_DELIVERY',
      ...delivery,
    },
  });
  ctx.orderIds.push(order.id);
  const part = await ctx.prisma.sellerOrder.create({
    data: { orderId: order.id, businessId: p.businessId, subtotal: p.price },
  });
  await ctx.prisma.orderItem.create({
    data: {
      sellerOrderId: part.id,
      businessId: p.businessId,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      unitPrice: p.price,
      quantity: 1,
      lineTotal: p.price,
    },
  });
  return { buyer, order, part };
}
test('vendedor avanza secuencia sin descontar dos veces y expone historial sin identidad privada', async () => {
  const f = await purchase();
  for (const [from, to] of [
    ['CONFIRMED', 'PREPARING'],
    ['PREPARING', 'SHIPPED'],
    ['SHIPPED', 'DELIVERED'],
  ])
    await change(ctx.seller.token, f.part.id, from!, to!, '  Entrega de prueba  ').expect(200);
  const r = (
    await client()
      .get(`/api/v1/seller/orders/${f.part.id}`)
      .auth(ctx.seller.token, { type: 'bearer' })
      .expect(200)
  ).body;
  assert.deepEqual(
    r.history.map((h: { toStatus: string }) => h.toStatus),
    ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'],
  );
  assert.deepEqual(r.allowedStatuses, []);
  assert(
    r.history.every(
      (h: { actorId?: string; note: string }, i: number) =>
        !h.actorId && (!i || h.note === 'Entrega de prueba'),
    ),
  );
  for (let i = 1; i < r.history.length; i++)
    assert(Date.parse(r.history[i].createdAt) > Date.parse(r.history[i - 1].createdAt));
  assert.equal(
    (await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } })).stock,
    1,
  );
  assert.equal(
    await ctx.prisma.inventoryMovement.count({ where: { sellerOrderId: f.part.id } }),
    1,
  );
  const receipt = (
    await client()
      .get(`/api/v1/orders/${f.order.id}`)
      .auth(f.buyer.token, { type: 'bearer' })
      .expect(200)
  ).body;
  assert.equal(receipt.sellerOrders[0].history.length, 4);
});
test('saltos, retrocesos, estados finales y datos obsoletos son rechazados', async () => {
  const f = await purchase();
  await change(ctx.seller.token, f.part.id, 'CONFIRMED', 'DELIVERED').expect(409);
  await change(ctx.seller.token, f.part.id, 'CONFIRMED', 'PENDING').expect(409);
  await change(ctx.seller.token, f.part.id, 'CONFIRMED', 'CONFIRMED').expect(409);
  await change(ctx.seller.token, f.part.id, 'PENDING', 'PREPARING').expect(409);
  await change(ctx.seller.token, f.part.id, 'CONFIRMED', 'PREPARING').expect(200);
  await change(ctx.seller.token, f.part.id, 'PREPARING', 'CONFIRMED').expect(409);
  await change(ctx.seller.token, f.part.id, 'PREPARING', 'SHIPPED').expect(200);
  await change(ctx.seller.token, f.part.id, 'SHIPPED', 'CANCELLED').expect(409);
  await change(ctx.seller.token, f.part.id, 'SHIPPED', 'DELIVERED').expect(200);
  await change(ctx.seller.token, f.part.id, 'DELIVERED', 'CANCELLED').expect(409);
});
test('roles y propiedad se aplican a ambos endpoints y al servicio', async () => {
  const f = await purchase();
  const stranger = await ctx.identity('CUSTOMER');
  const admin = await ctx.identity('ADMIN');
  await client()
    .patch(`/api/v1/seller/orders/${f.part.id}/status`)
    .send({ expectedStatus: 'CONFIRMED', status: 'PREPARING' })
    .expect(401);
  for (const token of [f.buyer.token, admin.token])
    await change(token, f.part.id, 'CONFIRMED', 'PREPARING').expect(403);
  await change(ctx.other.token, f.part.id, 'CONFIRMED', 'PREPARING').expect(404);
  await cancel(stranger.token, f.part.id).expect(404);
  await cancel(ctx.seller.token, f.part.id).expect(403);
  await assert.rejects(
    ctx.app.get(OrderTransitionsService).change(admin.user, f.part.id, {
      status: 'CANCELLED',
      expectedStatus: 'CONFIRMED',
      note: '',
    }),
    /permiso/,
  );
  await assert.rejects(
    ctx.app.get(OrderTransitionsService).change(f.buyer.user, f.part.id, {
      status: 'PREPARING',
      expectedStatus: 'CONFIRMED',
      note: '',
    }),
    /permiso/,
  );
});
test('cancelar un subpedido restaura solo su tienda y conserva importes/pago históricos', async () => {
  const f = await purchase(2, true, false, true);
  const r = await cancel(
    f.buyer.token,
    f.part.id,
    'CONFIRMED',
    'Ya no lo necesito (prueba)',
  ).expect(200);
  assert.equal(r.body.status, 'CANCELLED');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(
    (await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } })).stock,
    2,
  );
  assert.equal(
    (await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } })).status,
    'ACTIVE',
  );
  assert.equal(
    (await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[1]!.id } })).stock,
    2,
  );
  const other = await ctx.prisma.sellerOrder.findFirstOrThrow({
    where: { orderId: f.order.id, businessId: ctx.otherBusiness.id },
  });
  assert.equal(other.status, 'CONFIRMED');
  const order = await ctx.prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
  assert.equal(order.total.toFixed(2), f.order.total);
  assert.equal(order.paymentStatus, 'PAID');
  const receipt = (
    await client()
      .get(`/api/v1/orders/${f.order.id}`)
      .auth(f.buyer.token, { type: 'bearer' })
      .expect(200)
  ).body;
  assert.equal(receipt.activeProductsTotal, '10.10');
  const restored = await ctx.prisma.sellerOrder.findUniqueOrThrow({ where: { id: f.part.id } });
  assert(restored.stockRestoredAt);
});
test('cancelaciones simultáneas idénticas devuelven mismo resultado sin duplicar IN ni historial', async () => {
  const f = await purchase();
  const results = await Promise.all([
    cancel(f.buyer.token, f.part.id),
    cancel(f.buyer.token, f.part.id),
    cancel(f.buyer.token, f.part.id),
  ]);
  assert(results.every((r) => r.status === 200));
  assert.equal(
    await ctx.prisma.inventoryMovement.count({ where: { sellerOrderId: f.part.id, type: 'IN' } }),
    1,
  );
  assert.equal(
    await ctx.prisma.orderStatusHistory.count({ where: { sellerOrderId: f.part.id } }),
    2,
  );
  assert.equal(
    (await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } })).stock,
    3,
  );
  await cancel(f.buyer.token, f.part.id, 'CONFIRMED', 'Otra nota').expect(409);
});
test('carrera entre cliente cancelando y vendedor preparando solo permite una decisión', async () => {
  const f = await purchase();
  const results = await Promise.all([
    cancel(f.buyer.token, f.part.id),
    change(ctx.seller.token, f.part.id, 'CONFIRMED', 'PREPARING'),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const part = await ctx.prisma.sellerOrder.findUniqueOrThrow({ where: { id: f.part.id } });
  assert.equal(
    (await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } })).stock,
    part.status === 'CANCELLED' ? 3 : 1,
  );
  assert.equal(
    await ctx.prisma.orderStatusHistory.count({ where: { sellerOrderId: f.part.id } }),
    2,
  );
});
test('cliente no cancela preparación; vendedor sí, incluso con tienda suspendida', async () => {
  const f = await purchase();
  await change(ctx.seller.token, f.part.id, 'CONFIRMED', 'PREPARING').expect(200);
  await cancel(f.buyer.token, f.part.id, 'PREPARING').expect(409);
  await ctx.prisma.business.update({
    where: { id: ctx.business.id },
    data: { status: 'SUSPENDED' },
  });
  try {
    await change(ctx.seller.token, f.part.id, 'PREPARING', 'CANCELLED').expect(200);
    assert.equal(
      (await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } })).status,
      'INACTIVE',
    );
  } finally {
    await ctx.prisma.business.update({
      where: { id: ctx.business.id },
      data: { status: 'ACTIVE' },
    });
  }
});
test('devolución respeta producto inactivo, categoría retirada y propietario inactivo', async () => {
  for (const mode of ['product', 'category', 'owner']) {
    const f = await purchase();
    if (mode === 'product')
      await ctx.prisma.product.update({ where: { id: f.ps[0]!.id }, data: { status: 'INACTIVE' } });
    if (mode === 'category')
      await ctx.prisma.category.update({
        where: { id: ctx.category.id },
        data: { isActive: false },
      });
    if (mode === 'owner')
      await ctx.prisma.user.update({
        where: { id: ctx.seller.user.id },
        data: { isActive: false },
      });
    try {
      await cancel(f.buyer.token, f.part.id).expect(200);
      const p = await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } });
      assert.equal(p.stock, 3);
      assert.equal(p.status, 'INACTIVE');
    } finally {
      await ctx.prisma.category.update({
        where: { id: ctx.category.id },
        data: { isActive: true },
      });
      await ctx.prisma.user.update({ where: { id: ctx.seller.user.id }, data: { isActive: true } });
    }
  }
});
test('desbordamiento revierte restauración completa, marcas e historial', async () => {
  const f = await purchase(3, false, true);
  const last = [...f.ps].sort((a, b) => a.id.localeCompare(b.id)).at(-1)!;
  await ctx.prisma.product.update({ where: { id: last.id }, data: { stock: 2147483647 } });
  const before = await ctx.prisma.product.findMany({
    where: { id: { in: f.ps.map((p) => p.id) } },
    orderBy: { id: 'asc' },
    select: { id: true, stock: true },
  });
  await cancel(f.buyer.token, f.part.id).expect(409);
  assert.deepEqual(
    await ctx.prisma.product.findMany({
      where: { id: { in: f.ps.map((p) => p.id) } },
      orderBy: { id: 'asc' },
      select: { id: true, stock: true },
    }),
    before,
  );
  assert.equal(
    await ctx.prisma.inventoryMovement.count({ where: { sellerOrderId: f.part.id, type: 'IN' } }),
    0,
  );
  const part = await ctx.prisma.sellerOrder.findUniqueOrThrow({ where: { id: f.part.id } });
  assert.equal(part.status, 'CONFIRMED');
  assert.equal(part.stockRestoredAt, null);
  assert.equal(
    await ctx.prisma.orderStatusHistory.count({ where: { sellerOrderId: f.part.id } }),
    1,
  );
});
test('confirmación de PENDING descuenta una vez y el segundo comprador no obtiene último stock', async () => {
  const p = await product(1);
  const first = await pending(p);
  const second = await pending(p);
  const results = await Promise.all([
    change(ctx.seller.token, first.part.id, 'PENDING', 'CONFIRMED'),
    change(ctx.seller.token, second.part.id, 'PENDING', 'CONFIRMED'),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await ctx.prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock, 0);
  const won = results[0]!.status === 200 ? first : second;
  await change(ctx.seller.token, won.part.id, 'PENDING', 'CONFIRMED').expect(200);
  assert.equal(
    await ctx.prisma.inventoryMovement.count({
      where: { sellerOrderId: won.part.id, type: 'OUT' },
    }),
    1,
  );
});
test('PENDING sin descuento se cancela sin inventar devolución y publicación inválida no confirma', async () => {
  const p = await product();
  const first = await pending(p);
  await ctx.prisma.category.update({ where: { id: ctx.category.id }, data: { isActive: false } });
  try {
    await change(ctx.seller.token, first.part.id, 'PENDING', 'CONFIRMED').expect(409);
    await cancel(first.buyer.token, first.part.id, 'PENDING').expect(200);
  } finally {
    await ctx.prisma.category.update({ where: { id: ctx.category.id }, data: { isActive: true } });
  }
  assert.equal((await ctx.prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock, 3);
  assert.equal(
    await ctx.prisma.inventoryMovement.count({ where: { sellerOrderId: first.part.id } }),
    0,
  );
});
test('ajuste del vendedor y cancelación comparten bloqueo y mantienen movimientos coherentes', async () => {
  const f = await purchase();
  const results = await Promise.all([
    cancel(f.buyer.token, f.part.id),
    client()
      .patch(`/api/v1/seller/products/${f.ps[0]!.id}`)
      .auth(ctx.seller.token, { type: 'bearer' })
      .send({ stock: 7 }),
  ]);
  assert(results.every((r) => r.status === 200));
  const p = await ctx.prisma.product.findUniqueOrThrow({ where: { id: f.ps[0]!.id } });
  assert([7, 9].includes(p.stock));
  const movements = await ctx.prisma.inventoryMovement.findMany({ where: { productId: p.id } });
  assert(movements.every((m) => m.previousStock + m.quantity === m.newStock));
  assert.equal(movements.filter((m) => m.type === 'IN').length, 1);
});
test('DTO rechaza campos privilegiados, notas inválidas e IDs; filtro seller no altera propiedad', async () => {
  const f = await purchase();
  for (const extra of [
    { actorId: randomUUID() },
    { stockRestoredAt: new Date().toISOString() },
    { note: null },
    { note: 'x'.repeat(501) },
    { note: 'bad\u0000note' },
    { status: 'PAID' },
  ])
    await client()
      .patch(`/api/v1/seller/orders/${f.part.id}/status`)
      .auth(ctx.seller.token, { type: 'bearer' })
      .send({ expectedStatus: 'CONFIRMED', status: 'PREPARING', ...extra })
      .expect(400);
  await client()
    .patch(`/api/v1/orders/seller-orders/${f.part.id}/cancel`)
    .auth(f.buyer.token, { type: 'bearer' })
    .send({ expectedStatus: 'CONFIRMED', status: 'CANCELLED' })
    .expect(400);
  await change(ctx.seller.token, 'invalid', 'CONFIRMED', 'PREPARING').expect(400);
  await cancel(f.buyer.token, f.part.id).expect(200);
  const r = (
    await client()
      .get('/api/v1/seller/orders?status=CANCELLED&limit=50')
      .auth(ctx.seller.token, { type: 'bearer' })
      .expect(200)
  ).body;
  assert(
    r.data.every(
      (row: { status: string; business: { id: string } }) =>
        row.status === 'CANCELLED' && row.business.id === ctx.business.id,
    ),
  );
  await client()
    .get('/api/v1/seller/orders?status=INVALID')
    .auth(ctx.seller.token, { type: 'bearer' })
    .expect(400);
});
test('OpenAPI documenta cambios, cancelación y trazabilidad sin publicar actores', async () => {
  const spec = (await client().get('/api/docs-json').expect(200)).body;
  for (const path of [
    '/api/v1/seller/orders/{id}/status',
    '/api/v1/orders/seller-orders/{id}/cancel',
  ]) {
    assert(spec.paths[path].patch.responses['409']);
    assert.deepEqual(spec.paths[path].patch.security, [{ bearer: [] }]);
  }
  assert(spec.components.schemas.OrderHistoryResponse.properties.createdAt);
  assert(!spec.components.schemas.OrderHistoryResponse.properties.actorId);
});
