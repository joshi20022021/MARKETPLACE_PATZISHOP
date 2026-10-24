import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { provisionAdmin } from '../src/admin/provision-admin';
import { REFRESH_COOKIE } from '../src/auth/auth.constants';
let app: INestApplication;
let db: PrismaService;
let emails: string[];
let categorySlug: string;
const password = 'JourneyFixture19!2026';
beforeEach(async () => {
  emails = [];
  categorySlug = `journey-${randomUUID()}`;
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  db = app.get(PrismaService);
});
afterEach(async () => {
  try {
    if (!db) return;
    const users = await db.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    const orders = { customerId: { in: ids } };
    const businesses = { ownerId: { in: ids } };
    const businessIds = (
      await db.business.findMany({ where: businesses, select: { id: true } })
    ).map((row) => row.id);
    await db.$transaction(async (tx) => {
      await tx.orderStatusHistory.deleteMany({ where: { sellerOrder: { order: orders } } });
      await tx.inventoryMovement.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.orderItem.deleteMany({ where: { sellerOrder: { order: orders } } });
      await tx.sellerOrder.deleteMany({ where: { order: orders } });
      await tx.order.deleteMany({ where: orders });
      await tx.product.deleteMany({ where: { business: businesses } });
      await tx.business.deleteMany({ where: businesses });
      await tx.category.deleteMany({ where: { slug: categorySlug } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
    assert.equal(await db.user.count({ where: { email: { in: emails } } }), 0);
    assert.equal(await db.category.count({ where: { slug: categorySlug } }), 0);
  } finally {
    if (app) await app.close();
  }
});
const client = () => request(app.getHttpServer());
const authPost = (path: string) =>
  client().post(`/api/v1/auth/${path}`).set('X-PatziShop-CSRF', '1');
function cookie(response: Response) {
  const values: unknown = response.headers['set-cookie'];
  assert(Array.isArray(values));
  const value = values.find((header: string) => header.startsWith(`${REFRESH_COOKIE}=`));
  assert.equal(typeof value, 'string');
  return (value as string).split(';')[0]!;
}
async function account(role: 'SELLER' | 'CUSTOMER') {
  const email = `journey-${randomUUID()}@example.test`;
  emails.push(email);
  const r = await authPost('register')
    .send({ name: `Cuenta ${role} prueba`, email, password, role })
    .expect(201);
  assert.equal(r.body.user.role, role);
  assert.equal(r.body.refreshToken, undefined);
  return { token: r.body.accessToken as string, id: r.body.user.id as string, cookie: cookie(r) };
}
async function adminAccount() {
  const email = `journey-${randomUUID()}@example.test`;
  emails.push(email);
  await provisionAdmin(db, { name: 'Administrador de prueba', email, password });
  return (await authPost('login').send({ email, password }).expect(200)).body.accessToken as string;
}
const delivery = {
  recipientName: 'Cliente ficticio',
  phone: '55550019',
  addressLine: 'Dirección ficticia, local 19',
  city: 'Patzicía',
  region: 'Chimaltenango',
  countryCode: 'GT',
  postalCode: '',
  deliveryInstructions: 'Sin entrega real',
};
for (const method of ['CASH_ON_DELIVERY', 'SIMULATED'] as const) {
  test(`recorrido HTTP completo ${method}: registro, revisión ADMIN, compra multi-tienda, cancelación y entrega`, async () => {
    const admin = await adminAccount();
    const category = (
      await client()
        .post('/api/v1/admin/categories')
        .auth(admin, { type: 'bearer' })
        .send({ name: 'Categoría del recorrido', slug: categorySlug })
        .expect(201)
    ).body;
    const sellers = [await account('SELLER'), await account('SELLER')];
    const customer = await account('CUSTOMER');
    const stranger = await account('CUSTOMER');
    const products: { id: string; slug: string; businessId: string }[] = [];
    const businesses: { id: string; status: string; updatedAt: string }[] = [];
    for (const [index, seller] of sellers.entries()) {
      const slug = `journey-${randomUUID()}`;
      const business = (
        await client()
          .post('/api/v1/seller/business')
          .auth(seller.token, { type: 'bearer' })
          .send({
            name: `Tienda ficticia ${index}`,
            slug,
            email: emails[index + 1],
            phone: '55550019',
            address: 'Dirección ficticia 19',
          })
          .expect(201)
      ).body;
      assert.equal(business.status, 'PENDING');
      const data = {
        categoryId: category.id,
        name: `Producto ficticio ${index}`,
        slug: `journey-${randomUUID()}`,
        description: 'Solo prueba',
        price: index === 0 ? '10.10' : '0.20',
        stock: 5,
        sku: randomUUID(),
        status: 'INACTIVE',
      };
      const draft = (
        await client()
          .post('/api/v1/seller/products')
          .auth(seller.token, { type: 'bearer' })
          .send(data)
          .expect(201)
      ).body;
      await client()
        .patch(`/api/v1/seller/products/${draft.id}`)
        .auth(seller.token, { type: 'bearer' })
        .send({ status: 'ACTIVE' })
        .expect(409);
      await client().get(`/api/v1/products/${data.slug}`).expect(404);
      const approved = (
        await client()
          .patch(`/api/v1/admin/businesses/${business.id}/status`)
          .auth(admin, { type: 'bearer' })
          .send({
            status: 'ACTIVE',
            expectedStatus: 'PENDING',
            expectedUpdatedAt: business.updatedAt,
          })
          .expect(200)
      ).body;
      businesses.push(approved);
      const published = (
        await client()
          .patch(`/api/v1/seller/products/${draft.id}`)
          .auth(seller.token, { type: 'bearer' })
          .send({ status: 'ACTIVE' })
          .expect(200)
      ).body;
      products.push(published);
      await client().get(`/api/v1/products/${published.slug}`).expect(200);
      await client()
        .post('/api/v1/cart/items')
        .auth(customer.token, { type: 'bearer' })
        .send({ productId: published.id, quantity: 2 })
        .expect(201);
    }
    // Renew the real registration session and use the rotated credentials for the purchase.
    const renewed = await authPost('refresh').set('Cookie', customer.cookie).expect(200);
    customer.token = renewed.body.accessToken;
    customer.cookie = cookie(renewed);
    const payload = { delivery, paymentMethod: method };
    const preview = (
      await client()
        .post('/api/v1/checkout/preview')
        .auth(customer.token, { type: 'bearer' })
        .send(payload)
        .expect(200)
    ).body;
    const confirm = {
      ...payload,
      reviewVersion: preview.reviewVersion,
      idempotencyKey: randomUUID(),
    };
    const order = (
      await client()
        .post('/api/v1/orders')
        .auth(customer.token, { type: 'bearer' })
        .send(confirm)
        .expect(201)
    ).body;
    assert.equal(order.total, '20.60');
    assert.equal(order.sellerOrders.length, 2);
    assert.equal(order.paymentStatus, method === 'SIMULATED' ? 'PAID' : 'PENDING');
    assert.equal(order.simulation, method === 'SIMULATED');
    const retry = await client()
      .post('/api/v1/orders')
      .auth(customer.token, { type: 'bearer' })
      .send(confirm)
      .expect(201);
    assert.equal(retry.body.id, order.id);
    const recovered = await client()
      .get(`/api/v1/orders/confirmation/${confirm.idempotencyKey}`)
      .auth(customer.token, { type: 'bearer' })
      .expect(200);
    assert.equal(recovered.body.id, order.id);
    assert.equal(
      (await client().get('/api/v1/cart').auth(customer.token, { type: 'bearer' }).expect(200)).body
        .quantityCount,
      0,
    );
    const parts = await db.sellerOrder.findMany({
      where: { orderId: order.id },
      orderBy: { subtotal: 'desc' },
    });
    assert.equal(parts.length, 2);
    const first = parts[0]!;
    const second = parts[1]!;
    await client()
      .get(`/api/v1/orders/${order.id}`)
      .auth(stranger.token, { type: 'bearer' })
      .expect(404);
    await client()
      .get(`/api/v1/seller/orders/${first.id}`)
      .auth(sellers[1]!.token, { type: 'bearer' })
      .expect(404);
    const own = await client()
      .get(`/api/v1/seller/orders/${first.id}`)
      .auth(sellers[0]!.token, { type: 'bearer' })
      .expect(200);
    assert.equal(own.body.subtotal, '20.20');
    assert.equal(own.body.total, undefined);
    // Commercial suspension after the purchase does not remove the seller's duty to fulfil it.
    const business = businesses[0]!;
    await client()
      .patch(`/api/v1/admin/businesses/${business.id}/status`)
      .auth(admin, { type: 'bearer' })
      .send({
        status: 'SUSPENDED',
        expectedStatus: 'ACTIVE',
        expectedUpdatedAt: business.updatedAt,
      })
      .expect(200);
    await client().get(`/api/v1/products/${products[0]!.slug}`).expect(404);
    let status = 'CONFIRMED';
    for (const next of ['PREPARING', 'SHIPPED', 'DELIVERED']) {
      await client()
        .patch(`/api/v1/seller/orders/${first.id}/status`)
        .auth(sellers[0]!.token, { type: 'bearer' })
        .send({ expectedStatus: status, status: next })
        .expect(200);
      status = next;
    }
    const cancel = { expectedStatus: 'CONFIRMED', note: 'Cancelación ficticia del recorrido' };
    await client()
      .patch(`/api/v1/orders/seller-orders/${second.id}/cancel`)
      .auth(customer.token, { type: 'bearer' })
      .send(cancel)
      .expect(200);
    await client()
      .patch(`/api/v1/orders/seller-orders/${second.id}/cancel`)
      .auth(customer.token, { type: 'bearer' })
      .send(cancel)
      .expect(200);
    const receipt = (
      await client()
        .get(`/api/v1/orders/${order.id}`)
        .auth(customer.token, { type: 'bearer' })
        .expect(200)
    ).body;
    assert.equal(receipt.total, '20.60');
    assert.equal(receipt.activeProductsTotal, '20.20');
    assert.equal(receipt.paymentStatus, order.paymentStatus);
    assert(!JSON.stringify(receipt).includes('actorId'));
    const inventory = await db.product.findMany({
      where: { id: { in: products.map((p) => p.id) } },
      select: { id: true, stock: true },
    });
    assert.equal(inventory.find((p) => p.id === products[0]!.id)!.stock, 3);
    assert.equal(inventory.find((p) => p.id === products[1]!.id)!.stock, 5);
    const movements = await db.inventoryMovement.findMany({
      where: { businessId: { in: businesses.map((b) => b.id) } },
    });
    assert.equal(movements.filter((m) => m.type === 'OUT').length, 2);
    assert.equal(movements.filter((m) => m.type === 'IN').length, 3);
    const events = await db.orderStatusHistory.findMany({
      where: { sellerOrder: { orderId: order.id } },
    });
    assert.equal(events.length, 6);
    const sellerSummary = (
      await client()
        .get('/api/v1/seller/dashboard')
        .auth(sellers[0]!.token, { type: 'bearer' })
        .expect(200)
    ).body;
    assert.equal(sellerSummary.orders.delivered, 1);
    assert.equal(sellerSummary.orders.cancelled, 0);
    const summary = (
      await client().get('/api/v1/admin/dashboard').auth(admin, { type: 'bearer' }).expect(200)
    ).body;
    assert(summary.orders.delivered >= 1);
    assert(summary.orders.cancelled >= 1);
    await authPost('logout').set('Cookie', customer.cookie).expect(204);
    await client()
      .get(`/api/v1/orders/${order.id}`)
      .auth(customer.token, { type: 'bearer' })
      .expect(401);
  });
}
