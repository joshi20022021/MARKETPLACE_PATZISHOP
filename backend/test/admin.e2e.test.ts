import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';
import request from 'supertest';
import { productContext } from './product-test-context';
import { AdminService } from '../src/admin/admin.service';
import { Prisma } from '../src/generated/prisma/client';
import { provisionAdmin } from '../src/admin/provision-admin';
import { compare } from 'bcrypt';
let ctx: Awaited<ReturnType<typeof productContext>>;
let admin: Awaited<ReturnType<typeof ctx.identity>>;
let provisionedIds: string[];
beforeEach(async () => {
  provisionedIds = [];
  ctx = await productContext();
  admin = await ctx.identity('ADMIN');
});
afterEach(async () => {
  if (ctx) {
    try {
      await ctx.prisma.user.deleteMany({ where: { id: { in: provisionedIds } } });
    } finally {
      await ctx.close();
    }
  }
});
const client = () => request(ctx.app.getHttpServer());
test('aprovisionamiento local crea ADMIN con hash y no convierte cuentas existentes', async () => {
  const email = `admin-${randomUUID()}@example.test`;
  const password = 'FixtureAdminPassword!2026';
  const created = await provisionAdmin(ctx.prisma, {
    name: ' Administradora prueba ',
    email: ` ${email.toUpperCase()} `,
    password,
  });
  provisionedIds.push(created.id);
  const row = await ctx.prisma.user.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(row.role, 'ADMIN');
  assert.equal(row.email, email);
  assert.equal(row.name, 'Administradora prueba');
  assert(await compare(password, row.passwordHash));
  assert.notEqual(row.passwordHash, password);
  await assert.rejects(
    provisionAdmin(ctx.prisma, { name: 'Otra cuenta', email: ctx.seller.user.email, password }),
    /El correo ya existe/u,
  );
  assert.equal(
    (await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.seller.user.id } })).role,
    'SELLER',
  );
});
test('aprovisionamiento rechaza datos incompletos o contraseña fuera de límites sin crear cuentas', async () => {
  const before = await ctx.prisma.user.count();
  for (const password of [undefined, 'short', 'á'.repeat(37)])
    await assert.rejects(
      provisionAdmin(ctx.prisma, { name: 'Admin', email: 'admin@example.test', password }),
      /Configura nombre/u,
    );
  await assert.rejects(
    provisionAdmin(ctx.prisma, { name: 'A', email: 'invalid', password: 'LongPassword!2026' }),
    /Configura nombre/u,
  );
  assert.equal(await ctx.prisma.user.count(), before);
});
const get = (path = '/dashboard', token = admin.token) =>
  client().get(`/api/v1/admin${path}`).auth(token, { type: 'bearer' });
const detail = async () => (await get(`/businesses/${ctx.business.id}`).expect(200)).body;
function patch(
  row: { id: string; status: string; updatedAt: string },
  status: string,
  token = admin.token,
) {
  return client()
    .patch(`/api/v1/admin/businesses/${row.id}/status`)
    .auth(token, { type: 'bearer' })
    .send({ status, expectedStatus: row.status, expectedUpdatedAt: row.updatedAt });
}
test('ADMIN exacto, sesión vigente y autorización defensiva del servicio', async () => {
  await client().get('/api/v1/admin/dashboard').expect(401);
  for (const token of [ctx.seller.token, (await ctx.identity('CUSTOMER')).token]) {
    for (const path of ['/dashboard', '/businesses', `/businesses/${ctx.business.id}`])
      await get(path, token).expect(403);
    await patch(await detail(), 'SUSPENDED', token).expect(403);
  }
  const service = ctx.app.get(AdminService);
  await assert.rejects(service.summary(ctx.seller.user), { status: 403 });
  await assert.rejects(service.list(ctx.seller.user, { page: 1, limit: 12 }), { status: 403 });
  await assert.rejects(service.byId(ctx.seller.user, ctx.business.id), { status: 403 });
  await assert.rejects(
    service.changeStatus(ctx.seller.user, ctx.business.id, {
      status: 'SUSPENDED',
      expectedStatus: 'ACTIVE',
      expectedUpdatedAt: new Date().toISOString(),
    }),
    { status: 403 },
  );
  await ctx.prisma.user.update({ where: { id: admin.user.id }, data: { isActive: false } });
  await get().expect(401);
});
test('métricas cuentan roles y publicaciones elegibles de todas las tiendas', async () => {
  const before = (await get().expect(200)).body;
  await ctx.identity('CUSTOMER');
  const seller = await ctx.identity('SELLER');
  await ctx.prisma.user.update({ where: { id: seller.user.id }, data: { isActive: false } });
  for (const [status, stock, businessId] of [
    ['ACTIVE', 3, ctx.business.id],
    ['ACTIVE', 2, ctx.otherBusiness.id],
    ['INACTIVE', 3, ctx.business.id],
    ['OUT_OF_STOCK', 0, ctx.business.id],
  ] as const) {
    const p = await ctx.prisma.product.create({
      data: { ...ctx.productInput(), status, stock, businessId },
    });
    ctx.productIds.push(p.id);
  }
  const after = (await get().expect(200)).body;
  assert.equal(after.users.total, before.users.total + 2);
  assert.equal(after.users.customers, before.users.customers + 1);
  assert.equal(after.users.sellers, before.users.sellers + 1);
  assert.equal(after.users.active, before.users.active + 1);
  assert.equal(after.products.total, before.products.total + 4);
  assert.equal(after.products.published, before.products.published + 2);
  await ctx.prisma.category.update({ where: { id: ctx.category.id }, data: { isActive: false } });
  assert.equal((await get().expect(200)).body.products.published, before.products.published);
  assert(!JSON.stringify(after).includes('passwordHash'));
});
test('sumas globales usan partes no canceladas y no duplican pedidos ni mezclan simulación', async () => {
  const before = (await get().expect(200)).body.orders;
  const customer = await ctx.identity('CUSTOMER');
  for (const method of ['CASH_ON_DELIVERY', 'SIMULATED'] as const) {
    const order = await ctx.prisma.order.create({
      data: {
        customerId: customer.user.id,
        total: '999.99',
        paymentMethod: method,
        recipientName: 'Prueba',
        phone: '55550000',
        addressLine: 'Prueba local',
        city: 'Patzicía',
        region: 'Chimaltenango',
      },
    });
    ctx.orderIds.push(order.id);
    await ctx.prisma.sellerOrder.create({
      data: {
        orderId: order.id,
        businessId: ctx.business.id,
        subtotal: '10.10',
        status: 'DELIVERED',
      },
    });
    await ctx.prisma.sellerOrder.create({
      data: {
        orderId: order.id,
        businessId: ctx.otherBusiness.id,
        subtotal: '989.89',
        status: 'CANCELLED',
      },
    });
  }
  const r = await get().expect(200);
  const after = r.body.orders;
  assert.equal(after.total, before.total + 2);
  assert.equal(after.sellerOrders, before.sellerOrders + 4);
  assert.equal(after.delivered, before.delivered + 2);
  assert.equal(after.cancelled, before.cancelled + 2);
  for (const key of ['cashOnDeliveryTotal', 'simulatedTotal'])
    assert.equal(after[key], new Prisma.Decimal(before[key]).plus('10.10').toFixed(2));
  assert.equal(r.headers['cache-control'], 'no-store');
});
test('revisión de tiendas: aprobar, suspender, reactivar y rechazar con retorno a revisión', async () => {
  await ctx.prisma.business.update({ where: { id: ctx.business.id }, data: { status: 'PENDING' } });
  let row = await detail();
  assert.deepEqual(row.allowedStatuses, ['ACTIVE', 'REJECTED']);
  for (const status of ['REJECTED', 'PENDING', 'ACTIVE', 'SUSPENDED', 'ACTIVE']) {
    row = (await patch(row, status).expect(200)).body;
    assert.equal(row.status, status);
  }
  assert.equal(row.owner.name, ctx.seller.user.name);
  assert(!JSON.stringify(row).includes('passwordHash'));
  assert(!JSON.stringify(row).includes(ctx.seller.user.email));
});
test('suspensión oculta tienda/productos, conserva inventario y bloquea edición comercial', async () => {
  const p = await ctx.prisma.product.create({
    data: { ...ctx.productInput(), businessId: ctx.business.id, status: 'ACTIVE' },
  });
  ctx.productIds.push(p.id);
  await client().get(`/api/v1/products/${p.slug}`).expect(200);
  const row = (await patch(await detail(), 'SUSPENDED').expect(200)).body;
  await client().get(`/api/v1/products/${p.slug}`).expect(404);
  await client().get(`/api/v1/businesses/${ctx.business.slug}`).expect(404);
  await client()
    .patch(`/api/v1/seller/products/${p.id}`)
    .auth(ctx.seller.token, { type: 'bearer' })
    .send({ price: '25.00' })
    .expect(403);
  await patch(row, 'ACTIVE').expect(200);
  await client().get(`/api/v1/products/${p.slug}`).expect(200);
  const current = await ctx.prisma.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(current.stock, p.stock);
  assert.equal(current.status, 'ACTIVE');
});
test('carreras de revisión y versiones antiguas permiten una sola decisión', async () => {
  await ctx.prisma.business.update({ where: { id: ctx.business.id }, data: { status: 'PENDING' } });
  const row = await detail();
  const results = await Promise.all([patch(row, 'ACTIVE'), patch(row, 'REJECTED')]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(results.find((r) => r.status === 409)!.body.error, 'BUSINESS_CHANGED');
  await patch(row, 'ACTIVE').expect(409);
});
test('edición de datos o ciclo de estado invalida una revisión anterior', async () => {
  const old = await detail();
  let row = (await patch(old, 'SUSPENDED').expect(200)).body;
  row = (await patch(row, 'ACTIVE').expect(200)).body;
  await patch(old, 'SUSPENDED').expect(409);
  await ctx.prisma.business.update({
    where: { id: ctx.business.id },
    data: {
      name: 'Nombre actualizado',
      updatedAt: new Date(new Date(row.updatedAt).getTime() + 1),
    },
  });
  await patch(row, 'SUSPENDED').expect(409);
});
test('aprobación exige propietario SELLER activo y no reescribe productos o pedidos', async () => {
  await ctx.prisma.business.update({ where: { id: ctx.business.id }, data: { status: 'PENDING' } });
  for (const data of [{ isActive: false }, { isActive: true, role: 'CUSTOMER' as const }]) {
    await ctx.prisma.user.update({ where: { id: ctx.seller.user.id }, data });
    const row = await detail();
    assert.deepEqual(row.allowedStatuses, ['REJECTED']);
    assert.equal((await patch(row, 'ACTIVE').expect(409)).body.error, 'BUSINESS_OWNER_UNAVAILABLE');
  }
  assert.equal(
    (await ctx.prisma.business.findUniqueOrThrow({ where: { id: ctx.business.id } })).status,
    'PENDING',
  );
});
test('lista paginada filtra estados y búsquedas literales sin publicar secretos', async () => {
  const marker = `review-${randomUUID()}`;
  await ctx.prisma.business.update({
    where: { id: ctx.business.id },
    data: { name: `${marker}%_`, status: 'PENDING' },
  });
  await ctx.prisma.business.update({
    where: { id: ctx.otherBusiness.id },
    data: { name: `${marker}other`, status: 'REJECTED' },
  });
  const r = await get(`/businesses?search=${marker}&limit=1`).expect(200);
  assert.equal(r.body.meta.total, 2);
  assert.equal(r.body.data.length, 1);
  const second = await get(`/businesses?search=${marker}&limit=1&page=2`).expect(200);
  assert.notEqual(second.body.data[0].id, r.body.data[0].id);
  assert.equal(
    (await get(`/businesses?search=${marker}&status=PENDING`).expect(200)).body.data[0].id,
    ctx.business.id,
  );
  const literal = await get(`/businesses?search=${encodeURIComponent(`${marker}%_`)}`).expect(200);
  assert.equal(literal.body.meta.total, 1);
  assert.equal(literal.headers['cache-control'], 'no-store');
  assert.equal(
    (await get(`/businesses?search=${marker}&page=10000`).expect(200)).body.data.length,
    0,
  );
});
test('DTO rechaza entradas extras, estados inválidos, versiones incompletas y rutas inexistentes', async () => {
  for (const query of [
    'page=0',
    'limit=51',
    'page=1&page=2',
    'status=OTHER',
    'status=ACTIVE&status=PENDING',
    'ownerId=x',
    `search=${'x'.repeat(121)}`,
  ])
    await get(`/businesses?${query}`).expect(400);
  await get('/businesses/no-uuid').expect(400);
  await get(`/businesses/${randomUUID()}`).expect(404);
  const row = await detail();
  for (const body of [
    {},
    { status: null },
    { status: 'ACTIVE', ownerId: randomUUID() },
    { status: 'PENDING', expectedUpdatedAt: '2026-10-23' },
  ])
    await client()
      .patch(`/api/v1/admin/businesses/${row.id}/status`)
      .auth(admin.token, { type: 'bearer' })
      .send({ expectedStatus: row.status, expectedUpdatedAt: row.updatedAt, ...body })
      .expect(400);
  await patch(row, 'REJECTED').expect(409);
  await patch({ ...row, id: randomUUID() }, 'SUSPENDED').expect(404);
});
test('OpenAPI documenta panel, filtro y cambios con errores de concurrencia', async () => {
  const spec = (await client().get('/api/docs-json').expect(200)).body;
  const path = spec.paths['/api/v1/admin/businesses/{id}/status'].patch;
  assert.deepEqual(path.security, [{ bearer: [] }]);
  for (const code of ['200', '400', '401', '403', '404', '409', '429'])
    assert(path.responses[code]);
  assert(spec.paths['/api/v1/admin/dashboard'].get.responses['200']);
  assert(spec.components.schemas.ChangeBusinessStatusDto.required.includes('expectedUpdatedAt'));
});
