import 'reflect-metadata';
import { Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { RefreshTokensService } from '../src/auth/refresh-tokens.service';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { DatabaseModule } from '../src/database/database.module';
import { SecurityModule } from '../src/security/security.module';
import type { PublicUser } from '../src/users/public-user';
import { createOrderFixture } from './database-fixtures';

export async function securityContext(controllers: Type[]) {
  const module = await Test.createTestingModule({
    imports: [AppModule, DatabaseModule, SecurityModule],
    controllers,
  }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  const fixture = await prisma.$transaction((tx) => createOrderFixture(tx));
  const businessIds = [fixture.firstProduct.businessId, fixture.otherProduct.businessId];
  const businesses = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    orderBy: { name: 'asc' },
  });
  const seller = await prisma.user.findUniqueOrThrow({ where: { id: businesses[0]!.ownerId } });
  const otherSeller = await prisma.user.findUniqueOrThrow({
    where: { id: businesses[1]!.ownerId },
  });
  const admin = await prisma.user.create({
    data: {
      name: 'Admin prueba',
      email: `admin-${fixture.customer.id}@example.test`,
      passwordHash: 'TEST_ONLY_NOT_A_LOGIN_HASH',
      role: 'ADMIN',
    },
  });
  const otherCustomer = await prisma.user.create({
    data: {
      name: 'Otro cliente',
      email: `other-${fixture.customer.id}@example.test`,
      passwordHash: 'TEST_ONLY_NOT_A_LOGIN_HASH',
    },
  });
  const address = await prisma.address.create({
    data: {
      userId: fixture.customer.id,
      label: 'Prueba',
      recipientName: 'Cliente',
      phone: '55550000',
      addressLine: 'Dirección',
      city: 'Patzicía',
      region: 'Chimaltenango',
    },
  });
  const users = [admin, seller, otherSeller, fixture.customer, otherCustomer];
  const sessions = app.get(RefreshTokensService);
  const jwt = app.get(JwtService);
  async function access(user: PublicUser) {
    const grant = await prisma.$transaction((tx) => sessions.create(tx, user));
    return jwt.signAsync(
      { sub: user.id, sid: grant.familyId, tokenUse: 'access' },
      { expiresIn: 300 },
    );
  }
  const tokens = {
    admin: await access(admin),
    seller: await access(seller),
    otherSeller: await access(otherSeller),
    customer: await access(fixture.customer),
    otherCustomer: await access(otherCustomer),
  };
  async function close() {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.sellerOrder.deleteMany({ where: { orderId: fixture.order.id } });
        await tx.order.delete({ where: { id: fixture.order.id } });
        await tx.product.deleteMany({
          where: { id: { in: [fixture.firstProduct.id, fixture.otherProduct.id] } },
        });
        await tx.business.deleteMany({ where: { id: { in: businessIds } } });
        await tx.category.delete({ where: { id: fixture.category.id } });
        await tx.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
      });
    } finally {
      await app.close();
    }
  }
  return {
    app,
    prisma,
    fixture,
    address,
    tokens,
    admin,
    seller,
    otherSeller,
    customer: fixture.customer,
    close,
  };
}
