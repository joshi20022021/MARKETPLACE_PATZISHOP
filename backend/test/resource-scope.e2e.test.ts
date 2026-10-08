import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import request from 'supertest';
import { CurrentUser } from '../src/auth/current-user.decorator';
import { Roles } from '../src/auth/roles.decorator';
import { PrismaService } from '../src/database/prisma.service';
import { ResourceScopeService } from '../src/security/resource-scope.service';
import type { PublicUser } from '../src/users/public-user';
import { securityContext } from './security-test-context';

@Controller('_ownership')
class OwnershipProbe {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
  ) {}
  @Get('business/:id')
  @Roles('SELLER')
  async business(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.scopes.requireFound(
      await this.prisma.business.findFirst({
        where: { AND: [{ id }, this.scopes.sellerBusiness(user)] },
        select: { id: true },
      }),
    );
  }
  @Get('product/:id')
  @Roles('SELLER')
  async product(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.scopes.requireFound(
      await this.prisma.product.findFirst({
        where: { AND: [{ id }, this.scopes.sellerProduct(user)] },
        select: { id: true },
      }),
    );
  }
  @Get('seller-order/:id')
  @Roles('SELLER')
  async sellerOrder(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.scopes.requireFound(
      await this.prisma.sellerOrder.findFirst({
        where: { AND: [{ id }, this.scopes.sellerOrder(user)] },
        select: { id: true },
      }),
    );
  }
  @Get('order/:id')
  @Roles('CUSTOMER')
  async order(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.scopes.requireFound(
      await this.prisma.order.findFirst({
        where: { AND: [{ id }, this.scopes.customerOrder(user)] },
        select: { id: true },
      }),
    );
  }
  @Get('address/:id')
  async address(@CurrentUser() user: PublicUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.scopes.requireFound(
      await this.prisma.address.findFirst({
        where: { AND: [{ id }, this.scopes.ownAddress(user)] },
        select: { id: true },
      }),
    );
  }
}

let context: Awaited<ReturnType<typeof securityContext>>;
before(async () => {
  context = await securityContext([OwnershipProbe]);
});
after(async () => {
  if (context) await context.close();
});
const get = (kind: string, id: string, token: string) =>
  request(context.app.getHttpServer())
    .get(`/api/v1/_ownership/${kind}/${id}`)
    .auth(token, { type: 'bearer' });

test('vendedor accede solo a su tienda, productos y subpedidos en PostgreSQL real', async () => {
  const resources = [
    ['business', context.fixture.firstProduct.businessId],
    ['product', context.fixture.firstProduct.id],
    ['seller-order', context.fixture.firstSellerOrder.id],
  ];
  for (const [kind, id] of resources) {
    await get(kind!, id!, context.tokens.seller).expect(200);
    const foreign = await get(kind!, id!, context.tokens.otherSeller).expect(404);
    const missing = await get(kind!, randomUUID(), context.tokens.otherSeller).expect(404);
    assert.equal(foreign.body.error, 'RESOURCE_NOT_FOUND');
    assert.equal(foreign.body.message, missing.body.message);
    await get(kind!, id!, context.tokens.admin).expect(403);
    await get(kind!, id!, context.tokens.customer).expect(403);
  }
});

test('cliente accede solo a su pedido y cada identidad solo a sus direcciones', async () => {
  await get('order', context.fixture.order.id, context.tokens.customer).expect(200);
  await get('order', context.fixture.order.id, context.tokens.otherCustomer).expect(404);
  await get('order', context.fixture.order.id, context.tokens.seller).expect(403);
  await get('address', context.address.id, context.tokens.customer).expect(200);
  for (const token of [context.tokens.otherCustomer, context.tokens.seller, context.tokens.admin])
    await get('address', context.address.id, token).expect(404);
});

test('identificadores manipulados y userId/businessId en query no cambian la identidad', async () => {
  await get('product', 'not-a-uuid', context.tokens.seller).expect(400);
  const path = `/api/v1/_ownership/product/${context.fixture.firstProduct.id}`;
  await request(context.app.getHttpServer())
    .get(path)
    .auth(context.tokens.otherSeller, { type: 'bearer' })
    .query({
      userId: context.seller.id,
      businessId: context.fixture.firstProduct.businessId,
      role: 'ADMIN',
    })
    .expect(404);
});

test('scope de escritura evita modificar un producto ajeno en la misma consulta SQL', async () => {
  const scopes = context.app.get(ResourceScopeService);
  const result = await context.prisma.product.updateMany({
    where: {
      AND: [{ id: context.fixture.firstProduct.id }, scopes.sellerProduct(context.otherSeller)],
    },
    data: { name: 'Cambio ajeno' },
  });
  assert.equal(result.count, 0);
  assert.equal(
    (
      await context.prisma.product.findUniqueOrThrow({
        where: { id: context.fixture.firstProduct.id },
      })
    ).name,
    context.fixture.firstProduct.name,
  );
  const own = await context.prisma.product.updateMany({
    where: { AND: [{ id: context.fixture.firstProduct.id }, scopes.sellerProduct(context.seller)] },
    data: { name: 'Cambio propio' },
  });
  assert.equal(own.count, 1);
  const removed = await context.prisma.product.deleteMany({
    where: { AND: [{ id: context.fixture.otherProduct.id }, scopes.sellerProduct(context.seller)] },
  });
  assert.equal(removed.count, 0);
});

test('servicios rechazan rol incorrecto aunque no se invoquen desde un controller', () => {
  const scopes = context.app.get(ResourceScopeService);
  for (const method of [
    () => scopes.sellerProduct(context.customer),
    () => scopes.sellerOrder(context.admin),
    () => scopes.customerOrder(context.seller),
  ])
    assert.throws(method, /No tienes permiso/u);
});
