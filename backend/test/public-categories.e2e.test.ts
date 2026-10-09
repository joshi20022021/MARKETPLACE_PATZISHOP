import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { BASE_CATEGORIES, seedCategories } from '../prisma/categories';
import type { Category } from '../src/generated/prisma/client';
import { categoryContext } from './category-test-context';

let context: Awaited<ReturnType<typeof categoryContext>>;
let admin: Awaited<ReturnType<typeof context.identity>>;
const marker = `PublicCategory${randomUUID()}`;
const active: Category[] = [];
let inactive: Category;
before(async () => {
  context = await categoryContext();
  admin = await context.identity('ADMIN');
  for (const index of [0, 1, 2]) {
    active.push(
      await context.prisma.category.create({
        data: context.input({
          name: `${marker} Same`,
          description: index === 0 ? `${marker} 50%_\\ special` : 'Normal category',
        }) as { name: string; slug: string; description: string },
      }),
    );
  }
  inactive = await context.prisma.category.create({
    data: { ...context.input(), name: `${marker} Hidden`, isActive: false },
  });
});
after(async () => {
  if (context) await context.close();
});
const list = () => request(context.app.getHttpServer()).get('/api/v1/categories');
const detail = (slug: string) =>
  request(context.app.getHttpServer()).get(`/api/v1/categories/${slug}`);
const edit = (id: string) =>
  request(context.app.getHttpServer())
    .patch(`/api/v1/admin/categories/${id}`)
    .set('Authorization', `Bearer ${admin.token}`);

test('guests see only active categories with a limited public projection', async () => {
  const response = await list().query({ search: marker }).expect(200);
  assert.equal(response.body.meta.total, 3);
  const expected = ['id', 'name', 'slug', 'description'].sort();
  for (const row of response.body.data) assert.deepEqual(Object.keys(row).sort(), expected);
  assert(!response.body.data.some((row: { id: string }) => row.id === inactive.id));
  const data = await detail(active[0]!.slug).expect(200);
  assert.deepEqual(Object.keys(data.body).sort(), expected);
});

test('inactive and absent slugs share 404; canonical slugs are exact', async () => {
  for (const slug of [inactive.slug, randomUUID(), active[0]!.slug.toUpperCase()]) {
    const response = await detail(slug).expect(404);
    assert.equal(response.body.error, 'RESOURCE_NOT_FOUND');
  }
});

test('pagination is bounded with stable name/id order, totals and empty results', async () => {
  const ids = active.map((category) => category.id).sort();
  for (let page = 1; page <= 3; page++) {
    const response = await list().query({ search: marker, page, limit: 1 }).expect(200);
    assert.equal(response.body.data[0].id, ids[page - 1]);
    assert.deepEqual(response.body.meta, { page, limit: 1, total: 3, totalPages: 3 });
  }
  const defaults = await list().query({ search: marker }).expect(200);
  assert.equal(defaults.body.meta.page, 1);
  assert.equal(defaults.body.meta.limit, 20);
  const beyond = await list().query({ search: marker, page: 4, limit: 1 }).expect(200);
  assert.deepEqual(beyond.body.data, []);
  assert.equal(beyond.body.meta.total, 3);
  const empty = await list().query({ search: randomUUID() }).expect(200);
  assert.deepEqual(empty.body.data, []);
  assert.equal(empty.body.meta.totalPages, 0);
});

test('search trims text, ignores case and treats LIKE metacharacters literally', async () => {
  const insensitive = await list()
    .query({ search: ` ${marker.toLowerCase()} ` })
    .expect(200);
  assert.equal(insensitive.body.meta.total, 3);
  const special = await list()
    .query({ search: `${marker} 50%_\\` })
    .expect(200);
  assert.equal(special.body.meta.total, 1);
  assert.equal(special.body.data[0].id, active[0]!.id);
});

test('public queries reject malformed paging and attempts to override visibility', async () => {
  for (const query of [
    { isActive: 'false' },
    { isActive: 'true' },
    { parentId: randomUUID() },
    { page: 0 },
    { page: 10001 },
    { page: '1.2' },
    { page: ' 1' },
    { limit: 0 },
    { limit: 51 },
    { limit: '1e1' },
    { limit: ['1', '2'] },
    { search: ['a', 'b'] },
    { search: 'x'.repeat(121) },
  ])
    await list().query(query).expect(400);
});

test('administrative deactivation, reactivation and slug changes update public reads', async () => {
  const category = active[0]!;
  await edit(category.id).send({ isActive: false }).expect(200);
  await detail(category.slug).expect(404);
  assert.equal((await list().query({ search: marker }).expect(200)).body.meta.total, 2);
  await edit(category.id).send({ isActive: true }).expect(200);
  await detail(category.slug).expect(200);
  const newSlug = context.input().slug;
  await edit(category.id).send({ slug: newSlug }).expect(200);
  await detail(category.slug).expect(404);
  const renamed = await detail(newSlug).expect(200);
  assert.equal(renamed.body.id, category.id);
});

test('OpenAPI distinguishes public reads, ADMIN bearer, editable booleans and response contracts', async () => {
  const response = await request(context.app.getHttpServer()).get('/api/docs-json').expect(200);
  const paths = response.body.paths;
  for (const path of ['/api/v1/categories', '/api/v1/categories/{slug}']) {
    assert(paths[path].get);
    assert(!paths[path].get.security?.length);
    assert(paths[path].get.responses['429']);
  }
  const created = paths['/api/v1/admin/categories'].post;
  assert(created.security.some((value: Record<string, unknown>) => 'bearer' in value));
  assert(
    created.responses['201'].content['application/json'].schema.$ref.endsWith(
      '/AdminCategoryResponse',
    ),
  );
  assert(paths['/api/v1/admin/categories/{id}'].patch.responses['409']);
  assert(!paths['/api/v1/admin/categories/{id}'].delete);
  const schemas = response.body.components.schemas;
  assert.equal(schemas.CreateCategoryDto.properties.isActive.type, 'boolean');
  assert.deepEqual(schemas.CreateCategoryDto.required.sort(), ['name', 'slug']);
  assert(!schemas.UpdateCategoryDto.required?.length);
  assert(!schemas.UpdateCategoryDto.properties.parentId);
  assert.deepEqual(Object.keys(schemas.PublicCategoryResponse.properties).sort(), [
    'description',
    'id',
    'name',
    'slug',
  ]);
});

test('seed is repeatable and preserves administrative name, description, state and timestamps', async () => {
  assert.equal(BASE_CATEGORIES.length, 8);
  const seed = [{ name: 'Seed Category', slug: context.input().slug }];
  await seedCategories(context.prisma, seed);
  const row = await context.prisma.category.findUniqueOrThrow({ where: { slug: seed[0]!.slug } });
  await edit(row.id)
    .send({ name: 'Admin Edited', description: 'Admin description', isActive: false })
    .expect(200);
  const beforeSeed = await context.prisma.category.findUniqueOrThrow({ where: { id: row.id } });
  await seedCategories(context.prisma, seed);
  await seedCategories(context.prisma, seed);
  const afterSeed = await context.prisma.category.findUniqueOrThrow({ where: { id: row.id } });
  assert.deepEqual(afterSeed, beforeSeed);
  assert.equal(await context.prisma.category.count({ where: { slug: seed[0]!.slug } }), 1);
  await detail(seed[0]!.slug).expect(404);
});
