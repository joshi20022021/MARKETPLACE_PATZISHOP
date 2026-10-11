import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { productContext } from './product-test-context';
let context: Awaited<ReturnType<typeof productContext>>;
const base = '/api/v1/products';
before(async () => {
  context = await productContext();
});
after(async () => {
  if (context) await context.close();
});
async function product(overrides: Record<string, unknown> = {}) {
  const value = await context.prisma.product.create({
    data: {
      businessId: context.business.id,
      categoryId: context.category.id,
      name: 'Producto público',
      slug: `public-${randomUUID()}`,
      description: 'Descripción comercial',
      price: '10.10',
      sku: randomUUID(),
      stock: 3,
      status: 'ACTIVE',
      ...overrides,
    },
  });
  context.productIds.push(value.id);
  return value;
}
const client = () => request(context.app.getHttpServer());
test('invitados consultan proyección comercial, precio decimal y media ordenada sin campos privados', async () => {
  const value = await product();
  const firstUrl = `/api/v1/media/products/${randomUUID()}.webp`;
  const secondUrl = `/api/v1/media/products/${randomUUID()}.webp`;
  await context.prisma.productImage.createMany({
    data: [
      { productId: value.id, url: secondUrl, position: 1 },
      { productId: value.id, url: firstUrl, position: 0 },
    ],
  });
  await context.prisma.product.update({ where: { id: value.id }, data: { mainImage: firstUrl } });
  const response = await client().get(`${base}/${value.slug}`).expect(200);
  assert.equal(response.body.mainImage, firstUrl);
  assert.deepEqual(response.body.images, [
    { url: firstUrl, position: 0 },
    { url: secondUrl, position: 1 },
  ]);
  assert.equal(response.body.price, '10.10');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(Object.keys(response.body).sort(), [
    'business',
    'category',
    'description',
    'id',
    'images',
    'mainImage',
    'name',
    'price',
    'slug',
  ]);
  assert.deepEqual(Object.keys(response.body.business).sort(), ['id', 'logo', 'name', 'slug']);
  assert.equal(response.body.ownerId, undefined);
  assert.equal(response.body.sku, undefined);
  assert.equal(response.body.stock, undefined);
  const listing = await client()
    .get(base)
    .query({ businessSlug: context.business.slug })
    .expect(200);
  assert(listing.body.data.some((row: { id: string }) => row.id === value.id));
});
test('borradores y agotados nunca aparecen en lista ni detalle', async () => {
  for (const override of [
    { status: 'INACTIVE' },
    { status: 'OUT_OF_STOCK', stock: 0 },
    { stock: 0 },
  ]) {
    const value = await product(override);
    await client().get(`${base}/${value.slug}`).expect(404);
    const list = await client()
      .get(base)
      .query({ businessSlug: context.business.slug })
      .expect(200);
    assert(!list.body.data.some((row: { id: string }) => row.id === value.id));
  }
});
test('moderación, categoría y propietario ocultan inmediatamente el producto', async () => {
  const value = await product();
  const absent = async () => {
    await client().get(`${base}/${value.slug}`).expect(404);
    const list = await client()
      .get(base)
      .query({ businessSlug: context.business.slug })
      .expect(200);
    assert.equal(list.body.meta.total, 0);
  };
  for (const status of ['PENDING', 'SUSPENDED', 'REJECTED'] as const) {
    await context.prisma.business.update({ where: { id: context.business.id }, data: { status } });
    await absent();
  }
  await context.prisma.business.update({
    where: { id: context.business.id },
    data: { status: 'ACTIVE' },
  });
  await context.prisma.category.update({
    where: { id: context.category.id },
    data: { isActive: false },
  });
  await absent();
  await context.prisma.category.update({
    where: { id: context.category.id },
    data: { isActive: true },
  });
  await context.prisma.user.update({
    where: { id: context.seller.user.id },
    data: { isActive: false },
  });
  await absent();
  await context.prisma.user.update({
    where: { id: context.seller.user.id },
    data: { isActive: true, role: 'CUSTOMER' },
  });
  await absent();
  await context.prisma.user.update({
    where: { id: context.seller.user.id },
    data: { role: 'SELLER' },
  });
  await client().get(`${base}/${value.slug}`).expect(200);
});
test('filtros combinan tienda, categoría, búsqueda literal y rangos decimales inclusivos', async () => {
  const marker = randomUUID();
  const value = await product({ name: `${marker} 100%_local\\`, price: '0.10' });
  await product({ name: `${marker} 100xxlocal`, price: '0.11' });
  const list = await client()
    .get(base)
    .query({
      businessSlug: context.business.slug,
      categoryId: context.category.id,
      search: '100%_local\\',
      minPrice: '0.10',
      maxPrice: '0.10',
    })
    .expect(200);
  assert.deepEqual(
    list.body.data.map((row: { id: string }) => row.id),
    [value.id],
  );
  const other = await client()
    .get(base)
    .query({ businessSlug: context.otherBusiness.slug, search: marker })
    .expect(200);
  assert.equal(other.body.meta.total, 0);
  assert.equal(
    (await client().get(base).query({ categoryId: randomUUID(), search: marker }).expect(200)).body
      .meta.total,
    0,
  );
});
test('paginación estable y orden decimal con desempate no repiten productos', async () => {
  const marker = randomUUID();
  for (const price of ['10.00', '2.00', '2.00']) await product({ name: marker, price });
  const first = await client()
    .get(base)
    .query({ search: marker, sort: 'price-asc', limit: 2 })
    .expect(200);
  const second = await client()
    .get(base)
    .query({ search: marker, sort: 'price-asc', limit: 2, page: 2 })
    .expect(200);
  assert.deepEqual(
    first.body.data.map((row: { price: string }) => row.price),
    ['2.00', '2.00'],
  );
  assert.equal(second.body.data[0].price, '10.00');
  assert.equal(
    new Set([...first.body.data, ...second.body.data].map((row: { id: string }) => row.id)).size,
    3,
  );
  const desc = await client().get(base).query({ search: marker, sort: 'price-desc' }).expect(200);
  assert.equal(desc.body.data[0].price, '10.00');
  const empty = await client().get(base).query({ search: marker, page: 5, limit: 2 }).expect(200);
  assert.deepEqual(empty.body.data, []);
  assert.equal(empty.body.meta.total, 3);
});
test('query rechaza abuso, arrays, campos privilegiados y rangos invertidos', async () => {
  for (const query of [
    { page: 0 },
    { page: 10001 },
    { limit: 51 },
    { page: '1.5' },
    { categoryId: 'invalid' },
    { sort: 'stock' },
    { search: ['a', 'b'] },
    { status: 'INACTIVE' },
    { ownerId: randomUUID() },
    { minPrice: '-1' },
    { maxPrice: '1e3' },
    { minPrice: '1.001' },
    { minPrice: '10000000000' },
    { minPrice: '10.10', maxPrice: '10.09' },
  ])
    await client().get(base).query(query).expect(400);
});
test('detalle inexistente y despublicado tienen el mismo 404 y cambios de slug son inmediatos', async () => {
  const value = await product();
  const changed = `renamed-${randomUUID()}`;
  await context.prisma.product.update({ where: { id: value.id }, data: { slug: changed } });
  await client().get(`${base}/${value.slug}`).expect(404);
  await client().get(`${base}/${changed}`).expect(200);
  await context.prisma.product.update({ where: { id: value.id }, data: { status: 'INACTIVE' } });
  const hidden = await client().get(`${base}/${changed}`).expect(404);
  const missing = await client().get(`${base}/no-existe`).expect(404);
  assert.equal(hidden.body.error, missing.body.error);
  assert.equal(hidden.body.message, missing.body.message);
});
test('OpenAPI documenta consultas públicas, filtros y proyecciones explícitas', () => {
  const document = SwaggerModule.createDocument(context.app, new DocumentBuilder().build());
  assert.equal(document.paths[base]?.get?.security, undefined);
  assert(document.paths[`${base}/{slug}`]?.get);
  const params = document.paths[base]?.get?.parameters ?? [];
  assert(params.some((param) => 'name' in param && param.name === 'minPrice'));
  assert(document.components?.schemas?.PublicProductResponse);
});
