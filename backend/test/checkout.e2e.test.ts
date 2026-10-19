import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { productContext } from './product-test-context';
import { CheckoutService } from '../src/checkout/checkout.service';
import { PaymentService } from '../src/checkout/payment.service';
import type { PaymentMethod } from '../src/generated/prisma/client';
let context: Awaited<ReturnType<typeof productContext>>;
before(async () => {
  context = await productContext();
});
after(async () => {
  if (context) await context.close();
});
const client = () => request(context.app.getHttpServer());
const delivery = () => ({
  recipientName: ' Cliente prueba ',
  phone: ' +502 5555-0000 ',
  addressLine: ' Zona de prueba 1 ',
  city: ' Patzicía ',
  region: ' Chimaltenango ',
  postalCode: ' 04009 ',
  countryCode: 'GT',
  deliveryInstructions: ' Llamar al llegar\nEntregar en puerta ',
});
const input = () => ({ delivery: delivery(), paymentMethod: 'CASH_ON_DELIVERY' });
const preview = (token: string, body: unknown = input()) =>
  client()
    .post('/api/v1/checkout/preview')
    .auth(token, { type: 'bearer' })
    .send(body as object);
async function fixture(otherBusiness = false, price = '10.10') {
  const customer = await context.identity('CUSTOMER');
  const product = await context.prisma.product.create({
    data: {
      businessId: otherBusiness ? context.otherBusiness.id : context.business.id,
      categoryId: context.category.id,
      name: 'Producto checkout',
      slug: `checkout-${randomUUID()}`,
      description: 'Fixture temporal',
      price,
      sku: randomUUID(),
      stock: 5,
      status: 'ACTIVE',
    },
  });
  context.productIds.push(product.id);
  await client()
    .post('/api/v1/cart/items')
    .auth(customer.token, { type: 'bearer' })
    .send({ productId: product.id, quantity: 2 })
    .expect(201);
  return { ...customer, product };
}
test('options y preview exigen CUSTOMER, sesión vigente y permisos efectivos del servicio', async () => {
  await client().get('/api/v1/checkout/options').expect(401);
  await client().post('/api/v1/checkout/preview').send(input()).expect(401);
  const admin = await context.identity('ADMIN');
  for (const actor of [admin, context.seller]) {
    await client()
      .get('/api/v1/checkout/options')
      .auth(actor.token, { type: 'bearer' })
      .expect(403);
    await preview(actor.token).expect(403);
    assert.throws(() => context.app.get(CheckoutService).options(actor.user), /clientes/);
    await assert.rejects(
      context.app
        .get(CheckoutService)
        .preview(actor.user, { ...input(), paymentMethod: 'SIMULATED' }),
      /clientes/,
    );
  }
  const customer = await fixture();
  await context.prisma.user.update({ where: { id: customer.user.id }, data: { isActive: false } });
  await preview(customer.token).expect(401);
});
test('opciones son explícitas, locales, sin tarjetas y con compra deshabilitada', async () => {
  const customer = await context.identity('CUSTOMER');
  const result = await client()
    .get('/api/v1/checkout/options')
    .auth(customer.token, { type: 'bearer' })
    .expect(200);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.body.canPlaceOrder, false);
  assert.equal(result.body.currency, 'GTQ');
  assert.equal(result.body.countryCode, 'GT');
  assert.deepEqual(
    result.body.paymentMethods.map((value: { method: string }) => value.method),
    ['CASH_ON_DELIVERY', 'SIMULATED'],
  );
  assert.equal(result.body.paymentMethods[1].simulation, true);
  assert.equal(await context.prisma.cart.count({ where: { userId: customer.user.id } }), 0);
});
test('revisión normaliza entrega, combina tiendas y usa decimales actuales del servidor', async () => {
  const customer = await fixture();
  const second = await context.prisma.product.create({
    data: {
      ...context.productInput(),
      name: 'Segunda tienda',
      slug: `checkout-${randomUUID()}`,
      businessId: context.otherBusiness.id,
      categoryId: context.category.id,
      price: '0.10',
      stock: 3,
      status: 'ACTIVE',
    },
  });
  context.productIds.push(second.id);
  await client()
    .post('/api/v1/cart/items')
    .auth(customer.token, { type: 'bearer' })
    .send({ productId: second.id, quantity: 3 })
    .expect(201);
  await context.prisma.product.update({
    where: { id: customer.product.id },
    data: { price: '12.35' },
  });
  const result = await preview(customer.token).expect(200);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.body.stage, 'REVIEW_ONLY');
  assert.equal(result.body.canPlaceOrder, false);
  assert.equal(result.body.cart.groups.length, 2);
  assert.equal(result.body.cart.total, '25.00');
  assert.equal(result.body.payment.amount, '25.00');
  assert.equal(result.body.payment.status, 'PENDING');
  assert.equal(result.body.payment.requiresOnlinePayment, false);
  assert.equal(result.body.payment.simulation, false);
  assert.equal(result.body.shippingTotal, null);
  assert.equal(result.body.delivery.recipientName, 'Cliente prueba');
  assert.equal(result.body.delivery.deliveryInstructions, 'Llamar al llegar\nEntregar en puerta');
  const product = result.body.cart.groups[0].items[0].product;
  for (const field of ['sku', 'stock', 'ownerId', 'status'])
    assert.equal(product[field], undefined);
});
test('ambos métodos y reintentos solo revisan; no crean pedidos, direcciones, movimientos ni cambian stock/carrito', async () => {
  const customer = await fixture();
  const cartBefore = await context.prisma.cartItem.findMany({
    where: { cart: { userId: customer.user.id } },
  });
  const inventoryBefore = await context.prisma.inventoryMovement.count({
    where: { productId: customer.product.id },
  });
  for (const paymentMethod of ['CASH_ON_DELIVERY', 'SIMULATED', 'SIMULATED']) {
    const result = await preview(customer.token, { ...input(), paymentMethod }).expect(200);
    assert.equal(result.body.payment.method, paymentMethod);
    assert.equal(result.body.payment.status, 'PENDING');
    assert.equal(result.body.payment.simulation, paymentMethod === 'SIMULATED');
  }
  assert.equal(await context.prisma.order.count({ where: { customerId: customer.user.id } }), 0);
  assert.equal(await context.prisma.address.count({ where: { userId: customer.user.id } }), 0);
  assert.equal(
    await context.prisma.product
      .findUniqueOrThrow({ where: { id: customer.product.id } })
      .then((value) => value.stock),
    5,
  );
  assert.equal(
    await context.prisma.inventoryMovement.count({ where: { productId: customer.product.id } }),
    inventoryBefore,
  );
  assert.deepEqual(
    await context.prisma.cartItem.findMany({ where: { cart: { userId: customer.user.id } } }),
    cartBefore,
  );
});
test('carrito vacío y userId/cartId ajenos no permiten revisar productos de otra identidad', async () => {
  const owner = await fixture();
  const outsider = await context.identity('CUSTOMER');
  const result = await preview(outsider.token).query({ userId: owner.user.id }).expect(409);
  assert.equal(result.body.error, 'EMPTY_CART');
  await preview(outsider.token, { ...input(), userId: owner.user.id }).expect(400);
});
test('reducción de stock, agotado y despublicación impiden revisar sin exponer entrega ni producto', async () => {
  const customer = await fixture();
  for (const values of [{ stock: 1 }, { stock: 0 }, { status: 'INACTIVE' as const }]) {
    await context.prisma.product.update({
      where: { id: customer.product.id },
      data: { stock: 5, status: 'ACTIVE', ...values },
    });
    const result = await preview(customer.token).expect(409);
    assert.equal(result.body.error, 'CART_NEEDS_ATTENTION');
    assert(!JSON.stringify(result.body).includes('Cliente prueba'));
  }
});
test('categoría, moderación y propietario se comprueban de nuevo en cada revisión', async () => {
  const customer = await fixture();
  await context.prisma.category.update({
    where: { id: context.category.id },
    data: { isActive: false },
  });
  try {
    await preview(customer.token).expect(409);
  } finally {
    await context.prisma.category.update({
      where: { id: context.category.id },
      data: { isActive: true },
    });
  }
  await context.prisma.business.update({
    where: { id: context.business.id },
    data: { status: 'SUSPENDED' },
  });
  try {
    await preview(customer.token).expect(409);
  } finally {
    await context.prisma.business.update({
      where: { id: context.business.id },
      data: { status: 'ACTIVE' },
    });
  }
  await context.prisma.user.update({
    where: { id: context.seller.user.id },
    data: { role: 'CUSTOMER' },
  });
  try {
    await preview(customer.token).expect(409);
  } finally {
    await context.prisma.user.update({
      where: { id: context.seller.user.id },
      data: { role: 'SELLER' },
    });
  }
});
test('validación anidada rechaza fraude de importes, tarjetas, métodos y campos privilegiados', async () => {
  const customer = await fixture();
  for (const body of [
    null,
    {},
    { ...input(), delivery: null },
    { ...input(), delivery: [] },
    { ...input(), paymentMethod: 'CARD' },
    { ...input(), paymentMethod: null },
    { ...input(), total: '0.01' },
    { ...input(), cardNumber: 'TEST_CARD_NOT_REAL' },
    { ...input(), delivery: { ...delivery(), userId: randomUUID() } },
    { ...input(), delivery: { ...delivery(), countryCode: 'US' } },
  ])
    await preview(customer.token, body).expect(400);
  const result = await preview(customer.token, {
    ...input(),
    delivery: {
      ...delivery(),
      recipientName: 'PRIVATE_TEST_VALUE',
      cardNumber: 'TEST_CARD_NOT_REAL',
    },
  }).expect(400);
  assert(!JSON.stringify(result.body).includes('PRIVATE_TEST_VALUE'));
  assert(!JSON.stringify(result.body).includes('TEST_CARD_NOT_REAL'));
});
test('límites y control characters se rechazan; campos opcionales omitidos tienen defaults', async () => {
  const customer = await fixture();
  for (const extra of [
    { recipientName: ' ' },
    { recipientName: 'a'.repeat(121) },
    { phone: 'abcdefg' },
    { phone: ['55555555'] },
    { addressLine: 'x' },
    { addressLine: 'a'.repeat(501) },
    { city: 'a' },
    { region: 'a'.repeat(101) },
    { postalCode: null },
    { postalCode: 'x'.repeat(21) },
    { deliveryInstructions: 'a'.repeat(1001) },
    { recipientName: 'Test\u0000Value' },
  ])
    await preview(customer.token, { ...input(), delivery: { ...delivery(), ...extra } }).expect(
      400,
    );
  const result = await preview(customer.token, {
    paymentMethod: 'CASH_ON_DELIVERY',
    delivery: {
      recipientName: 'Cliente prueba',
      phone: '55550000',
      addressLine: 'Zona de prueba 1',
      city: 'Patzicía',
      region: 'Chimaltenango',
    },
  }).expect(200);
  assert.equal(result.body.delivery.countryCode, 'GT');
  assert.equal(result.body.delivery.postalCode, '');
  assert.equal(result.body.delivery.deliveryInstructions, '');
});
test('contrato de pago preserva cero y nunca declara PAID ni admite métodos desconocidos', () => {
  const service = context.app.get(PaymentService);
  const result = service.prepare('SIMULATED', '0.00');
  assert.equal(result.amount, '0.00');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.requiresOnlinePayment, false);
  assert.throws(() => service.prepare('CARD' as PaymentMethod, '1.00'), /válido/);
});
test('OpenAPI publica opciones y revisión protegidas, campos anidados y no crea rutas de compra', async () => {
  const result = await client().get('/api/docs-json').expect(200);
  for (const op of [
    result.body.paths['/api/v1/checkout/options'].get,
    result.body.paths['/api/v1/checkout/preview'].post,
  ])
    assert.deepEqual(op.security, [{ bearer: [] }]);
  assert(result.body.paths['/api/v1/checkout/preview'].post.responses['409']);
  assert.equal(result.body.components.schemas.DeliveryDto.properties.recipientName.maxLength, 120);
  assert(!result.body.paths['/api/v1/orders']);
  assert(!result.body.paths['/api/v1/checkout/confirm']);
});
