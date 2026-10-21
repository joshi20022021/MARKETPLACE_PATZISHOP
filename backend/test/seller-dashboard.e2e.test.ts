import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';
import request from 'supertest';
import { productContext } from './product-test-context';
let ctx: Awaited<ReturnType<typeof productContext>>;
beforeEach(async () => {
  ctx = await productContext();
});
afterEach(async () => {
  if (ctx) await ctx.close();
});
const client = () => request(ctx.app.getHttpServer());
const get = (token: string) =>
  client().get('/api/v1/seller/dashboard').auth(token, { type: 'bearer' });
async function product(
  stock: number,
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK',
  businessId = ctx.business.id,
) {
  const p = await ctx.prisma.product.create({
    data: { ...ctx.productInput(), stock, status, businessId },
  });
  ctx.productIds.push(p.id);
}
async function order(
  method: 'CASH_ON_DELIVERY' | 'SIMULATED',
  subtotal: string,
  status: 'CONFIRMED' | 'DELIVERED' | 'CANCELLED' = 'CONFIRMED',
  foreign = false,
) {
  const customer = await ctx.identity('CUSTOMER');
  const o = await ctx.prisma.order.create({
    data: {
      customerId: customer.user.id,
      total: '999.99',
      paymentMethod: method,
      recipientName: 'Fixture',
      phone: '55550000',
      addressLine: 'Dirección ficticia',
      city: 'Patzicía',
      region: 'Chimaltenango',
    },
  });
  ctx.orderIds.push(o.id);
  await ctx.prisma.sellerOrder.create({
    data: { orderId: o.id, businessId: ctx.business.id, subtotal, status },
  });
  if (foreign)
    await ctx.prisma.sellerOrder.create({
      data: { orderId: o.id, businessId: ctx.otherBusiness.id, subtotal: '989.89', status },
    });
}
test('panel requiere SELLER con sesión y usuario activos', async () => {
  await client().get('/api/v1/seller/dashboard').expect(401);
  for (const role of ['CUSTOMER', 'ADMIN'] as const)
    await get((await ctx.identity(role)).token).expect(403);
  await get(ctx.seller.token).expect(200);
  await ctx.prisma.user.update({ where: { id: ctx.seller.user.id }, data: { isActive: false } });
  await get(ctx.seller.token).expect(401);
});
test('sin tienda devuelve estado vacío explícito sin crear negocio', async () => {
  const seller = await ctx.identity();
  const result = await get(seller.token).expect(200);
  assert.equal(result.body.business, null);
  assert.deepEqual(result.body.products, {
    total: 0,
    active: 0,
    inactive: 0,
    outOfStock: 0,
    lowStock: 0,
  });
  assert.equal(result.body.orders.total, 0);
  assert.equal(result.body.orders.cashOnDeliveryTotal, '0.00');
  assert.equal(await ctx.prisma.business.count({ where: { ownerId: seller.user.id } }), 0);
});
test('cuenta estados y stock bajo 1–5 solo de la tienda autenticada', async () => {
  await product(1, 'ACTIVE');
  await product(5, 'INACTIVE');
  await product(6, 'ACTIVE');
  await product(0, 'OUT_OF_STOCK');
  await product(2, 'ACTIVE', ctx.otherBusiness.id);
  const result = await get(ctx.seller.token).expect(200);
  assert.deepEqual(result.body.products, {
    total: 4,
    active: 2,
    inactive: 1,
    outOfStock: 1,
    lowStock: 2,
  });
  assert.equal(result.body.business.id, ctx.business.id);
  assert(!JSON.stringify(result.body).includes(ctx.otherBusiness.id));
});
test('importes usan subtotal propio histórico y separan simulación de contra entrega', async () => {
  await order('CASH_ON_DELIVERY', '10.10', 'CONFIRMED', true);
  await order('SIMULATED', '0.20');
  await order('CASH_ON_DELIVERY', '3.33', 'DELIVERED');
  await order('CASH_ON_DELIVERY', '7.77', 'CANCELLED');
  const result = await get(ctx.seller.token).expect(200);
  assert.deepEqual(result.body.orders, {
    total: 4,
    open: 2,
    delivered: 1,
    cancelled: 1,
    cashOnDeliveryTotal: '13.43',
    simulatedTotal: '0.20',
    currency: 'GTQ',
  });
  assert.equal(result.headers['cache-control'], 'no-store');
  assert(!JSON.stringify(result.body).includes('989.89'));
  assert.equal((await get(ctx.other.token).expect(200)).body.orders.cashOnDeliveryTotal, '989.89');
});
test('moderación no oculta el resumen propio ni habilita escrituras desde el panel', async () => {
  await ctx.prisma.business.update({
    where: { id: ctx.business.id },
    data: { status: 'SUSPENDED' },
  });
  await product(4, 'INACTIVE');
  const result = await get(ctx.seller.token).expect(200);
  assert.equal(result.body.business.status, 'SUSPENDED');
  await client()
    .post('/api/v1/seller/dashboard')
    .auth(ctx.seller.token, { type: 'bearer' })
    .send({ businessId: ctx.otherBusiness.id })
    .expect(404);
  assert.equal(await ctx.prisma.product.count({ where: { businessId: ctx.business.id } }), 1);
});
test('identificadores en query no cambian ámbito y OpenAPI documenta permisos/respuesta', async () => {
  await product(3, 'ACTIVE', ctx.otherBusiness.id);
  const r = await client()
    .get('/api/v1/seller/dashboard')
    .query({ businessId: ctx.otherBusiness.id, ownerId: randomUUID() })
    .auth(ctx.seller.token, { type: 'bearer' })
    .expect(200);
  assert.equal(r.body.products.total, 0);
  const spec = (await client().get('/api/docs-json').expect(200)).body;
  const op = spec.paths['/api/v1/seller/dashboard'].get;
  assert.deepEqual(op.security, [{ bearer: [] }]);
  assert(op.responses['403']);
  assert(op.responses['200']);
});
