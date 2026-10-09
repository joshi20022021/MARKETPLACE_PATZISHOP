import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import request from 'supertest';
import sharp from 'sharp';
import { ImageStorage } from '../src/media/image-storage';
import { productContext } from './product-test-context';
let context: Awaited<ReturnType<typeof productContext>>;
let png: Buffer;
let storage: ImageStorage;
const urls: string[] = [];
before(async () => {
  context = await productContext();
  storage = context.app.get(ImageStorage);
  png = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff000080' } })
    .png()
    .toBuffer();
});
after(async () => {
  if (context) {
    try {
      for (const url of urls) await storage.remove(url);
    } finally {
      await context.close();
    }
  }
});
async function create(overrides: Record<string, unknown> = {}) {
  const response = await request(context.app.getHttpServer())
    .post('/api/v1/seller/products')
    .set('Authorization', `Bearer ${context.seller.token}`)
    .send(context.productInput(overrides))
    .expect(201);
  context.productIds.push(response.body.id);
  return response.body.id as string;
}
const upload = (id: string, token = context.seller.token) =>
  request(context.app.getHttpServer())
    .post(`/api/v1/seller/products/${id}/images`)
    .set('Authorization', `Bearer ${token}`);
const ownFile = (id: string, imageId: string, token = context.seller.token) =>
  request(context.app.getHttpServer())
    .get(`/api/v1/seller/products/${id}/images/${imageId}/file`)
    .set('Authorization', `Bearer ${token}`);
const remove = (id: string, imageId: string, token = context.seller.token) =>
  request(context.app.getHttpServer())
    .delete(`/api/v1/seller/products/${id}/images/${imageId}`)
    .set('Authorization', `Bearer ${token}`);
async function attach(id: string) {
  const response = await upload(id).attach('file', png, {
    filename: '../../unsafe-name.png',
    contentType: 'image/png',
  });
  if (response.status === 201)
    for (const image of response.body.images) if (!urls.includes(image.url)) urls.push(image.url);
  return response;
}

test('JPEG/PNG/WebP are decoded and stored as WebP under opaque generated names', async () => {
  const id = await create();
  for (const format of ['jpeg', 'png', 'webp'] as const) {
    const data = await sharp(png).toFormat(format).toBuffer();
    const response = await upload(id)
      .attach('file', data, { filename: `untrusted.${format}`, contentType: `image/${format}` })
      .expect(201);
    for (const image of response.body.images) if (!urls.includes(image.url)) urls.push(image.url);
    const image = response.body.images.at(-1);
    assert.match(image.url, /^\/api\/v1\/media\/products\/[0-9a-f-]{36}\.webp$/u);
    assert.equal(response.body.mainImage, response.body.images[0].url);
    const saved = await storage.read(image.url);
    const metadata = await sharp(saved).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 8);
    assert(!metadata.exif);
    const preview = await ownFile(id, image.id).expect(200);
    assert.match(preview.headers['content-type'] ?? '', /image\/webp/u);
    assert.equal(preview.headers['cache-control'], 'no-store');
    await request(context.app.getHttpServer()).get(image.url).expect(404);
  }
});

test('large oriented images are resized and EXIF metadata is stripped', async () => {
  const id = await create();
  const source = await sharp({
    create: { width: 3000, height: 100, channels: 3, background: '#123456' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  assert((await sharp(source).metadata()).exif);
  const response = await upload(id)
    .attach('file', source, { filename: 'oriented.jpg', contentType: 'image/jpeg' })
    .expect(201);
  const url = response.body.mainImage;
  urls.push(url);
  const output = await sharp(await storage.read(url)).metadata();
  assert.equal(output.height, 2048);
  assert(output.width! < output.height!);
  assert(!output.exif);
});

test('animated WebP is rejected despite having a supported format', async () => {
  const id = await create();
  const header = '47494638396101000100800000000000ffffff';
  const frame = '21f90400010000002c0000000001000100000202440100';
  // Distinct frames prevent the encoder from collapsing the fixture into a static WebP.
  const secondFrame = frame.replace('024401', '024c01');
  const gif = Buffer.from(header + frame + secondFrame + '3b', 'hex');
  const animation = await sharp(gif, { animated: true }).webp().toBuffer();
  assert.equal((await sharp(animation).metadata()).pages, 2);
  await upload(id)
    .attach('file', animation, { filename: 'animated.webp', contentType: 'image/webp' })
    .expect(400);
  assert.equal(await context.prisma.productImage.count({ where: { productId: id } }), 0);
});

test('spoofed, corrupt, unsupported and excessive-pixel images leave no image records', async () => {
  const id = await create();
  await upload(id)
    .attach('file', Buffer.from('<svg><script>unsafe</script></svg>'), {
      filename: 'image.png',
      contentType: 'image/png',
    })
    .expect(415);
  await upload(id)
    .attach('file', Buffer.from('%PDF-1.7'), {
      filename: 'image.pdf',
      contentType: 'application/pdf',
    })
    .expect(415);
  await upload(id)
    .attach('file', png, { filename: 'image.jpg', contentType: 'image/jpeg' })
    .expect(400);
  await upload(id)
    .attach('file', png.subarray(0, 20), { filename: 'image.png', contentType: 'image/png' })
    .expect(400);
  const oversized = await sharp({
    create: { width: 4097, height: 4097, channels: 3, background: '#fff' },
  })
    .png()
    .toBuffer();
  await upload(id)
    .attach('file', oversized, { filename: 'image.png', contentType: 'image/png' })
    .expect(400);
  assert.equal(await context.prisma.productImage.count({ where: { productId: id } }), 0);
});

test('multipart limits reject large files, extra files/fields and missing file', async () => {
  const id = await create();
  await upload(id)
    .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
      filename: 'large.png',
      contentType: 'image/png',
    })
    .expect(413);
  await upload(id)
    .attach('file', png, { filename: 'one.png', contentType: 'image/png' })
    .attach('file', png, { filename: 'two.png', contentType: 'image/png' })
    .expect(400);
  await upload(id)
    .field('businessId', context.business.id)
    .attach('file', png, { filename: 'image.png', contentType: 'image/png' })
    .expect(400);
  const missing = await upload(id).send({}).expect(400);
  assert.equal(missing.body.error, 'IMAGE_REQUIRED');
});

test('images enforce roles and ownership for upload, preview and deletion', async () => {
  const id = await create();
  const uploaded = await attach(id);
  assert.equal(uploaded.status, 201);
  const image = uploaded.body.images[0];
  await request(context.app.getHttpServer())
    .post(`/api/v1/seller/products/${id}/images`)
    .attach('file', png, { filename: 'image.png' })
    .expect(401);
  for (const role of ['CUSTOMER', 'ADMIN'] as const) {
    const identity = await context.identity(role);
    await upload(id, identity.token).attach('file', png, { filename: 'image.png' }).expect(403);
  }
  await upload(id, context.other.token).attach('file', png, { filename: 'image.png' }).expect(404);
  await ownFile(id, image.id, context.other.token).expect(404);
  await remove(id, image.id, context.other.token).expect(404);
  await remove(id, randomUUID()).expect(404);
  await ownFile(id, 'bad-id').expect(400);
  await storage.read(image.url);
});

test('concurrent uploads cannot exceed six images and positions remain unique', async () => {
  const id = await create();
  for (let index = 0; index < 5; index++) assert.equal((await attach(id)).status, 201);
  const responses = await Promise.all([attach(id), attach(id)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
  assert.equal(
    responses.find((response) => response.status === 409)!.body.error,
    'IMAGE_LIMIT_REACHED',
  );
  const images = await context.prisma.productImage.findMany({ where: { productId: id } });
  assert.equal(images.length, 6);
  assert.equal(new Set(images.map((image) => image.position)).size, 6);
});

test('deleting the primary image promotes the next; deleting the product removes its files', async () => {
  const id = await create();
  await attach(id);
  const response = await attach(id);
  assert.equal(response.status, 201);
  const [first, second] = response.body.images;
  await remove(id, first.id).expect(204);
  await assert.rejects(storage.read(first.url));
  const product = await request(context.app.getHttpServer())
    .get(`/api/v1/seller/products/${id}`)
    .set('Authorization', `Bearer ${context.seller.token}`)
    .expect(200);
  assert.equal(product.body.mainImage, second.url);
  await remove(id, second.id).expect(204);
  await assert.rejects(storage.read(second.url));
  const empty = await context.prisma.product.findUniqueOrThrow({ where: { id } });
  assert.equal(empty.mainImage, null);
  const again = await attach(id);
  const url = again.body.mainImage;
  await request(context.app.getHttpServer())
    .delete(`/api/v1/seller/products/${id}`)
    .set('Authorization', `Bearer ${context.seller.token}`)
    .expect(204);
  await assert.rejects(storage.read(url));
});

test('public media visibility follows product, stock, category, shop and owner state', async () => {
  const id = await create({ status: 'ACTIVE' });
  const response = await attach(id);
  assert.equal(response.status, 201);
  const image = response.body.images[0];
  const publicRead = () => request(context.app.getHttpServer()).get(image.url);
  const first = await publicRead().expect(200);
  assert.equal(first.headers['cross-origin-resource-policy'], 'cross-origin');
  assert.equal(first.headers['cache-control'], 'no-store');
  for (const change of [{ status: 'INACTIVE' as const }, { stock: 0 }]) {
    await context.prisma.product.update({ where: { id }, data: change });
    await publicRead().expect(404);
    await context.prisma.product.update({ where: { id }, data: { status: 'ACTIVE', stock: 3 } });
  }
  await context.prisma.category.update({
    where: { id: context.category.id },
    data: { isActive: false },
  });
  await publicRead().expect(404);
  await context.prisma.category.update({
    where: { id: context.category.id },
    data: { isActive: true },
  });
  await context.prisma.business.update({
    where: { id: context.business.id },
    data: { status: 'SUSPENDED' },
  });
  await publicRead().expect(404);
  await upload(id)
    .attach('file', png, { filename: 'image.png', contentType: 'image/png' })
    .expect(403);
  await context.prisma.business.update({
    where: { id: context.business.id },
    data: { status: 'ACTIVE' },
  });
  await context.prisma.user.update({
    where: { id: context.seller.user.id },
    data: { isActive: false },
  });
  await publicRead().expect(404);
  await context.prisma.user.update({
    where: { id: context.seller.user.id },
    data: { isActive: true, role: 'CUSTOMER' },
  });
  await publicRead().expect(404);
  await context.prisma.user.update({
    where: { id: context.seller.user.id },
    data: { role: 'SELLER' },
  });
  await publicRead().expect(200);
});

test('failed database attachment removes newly saved file without replacing existing images', async () => {
  const id = await create();
  const response = await attach(id);
  assert.equal(response.status, 201);
  const originalSave = storage.save.bind(storage);
  let savedUrl = '';
  storage.save = async (buffer) => {
    savedUrl = await originalSave(buffer);
    await context.prisma.business.update({
      where: { id: context.business.id },
      data: { status: 'SUSPENDED' },
    });
    return savedUrl;
  };
  try {
    await upload(id)
      .attach('file', png, { filename: 'image.png', contentType: 'image/png' })
      .expect(403);
    assert(savedUrl);
    await assert.rejects(storage.read(savedUrl));
    assert.equal(await context.prisma.productImage.count({ where: { productId: id } }), 1);
    await storage.read(response.body.mainImage);
  } finally {
    storage.save = originalSave;
    await context.prisma.business.update({
      where: { id: context.business.id },
      data: { status: 'ACTIVE' },
    });
  }
});

test('malformed media paths and files with no matching DB record return 404', async () => {
  const saved = await storage.save(await sharp(png).webp().toBuffer());
  urls.push(saved);
  await request(context.app.getHttpServer()).get(saved).expect(404);
  for (const key of ['not-an-image', '..%2f..%2f.env', `${randomUUID()}.png`])
    await request(context.app.getHttpServer()).get(`/api/v1/media/products/${key}`).expect(404);
  await assert.rejects(storage.read('/api/v1/media/products/../../.env'));
});

test('OpenAPI documents binary upload, limits, deletion and protected preview', async () => {
  const swagger = await request(context.app.getHttpServer()).get('/api/docs-json').expect(200);
  const paths = swagger.body.paths;
  const upload = paths['/api/v1/seller/products/{id}/images'].post;
  assert(
    upload.requestBody.content['multipart/form-data'].schema.properties.file.format === 'binary',
  );
  assert(upload.responses['413']);
  assert(upload.responses['415']);
  assert(upload.responses['409']);
  assert(paths['/api/v1/seller/products/{id}/images/{imageId}'].delete.responses['204']);
  assert(paths['/api/v1/seller/products/{id}/images/{imageId}/file'].get.security.length);
  assert(!paths['/api/v1/media/products/{key}'].get.security?.length);
});
