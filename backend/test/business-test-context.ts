import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { RefreshTokensService } from '../src/auth/refresh-tokens.service';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import type { Role } from '../src/generated/prisma/client';
import { PUBLIC_USER_SELECT } from '../src/users/public-user';

export async function businessContext() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  const userIds: string[] = [];
  const sessions = app.get(RefreshTokensService);
  const jwt = app.get(JwtService);
  async function identity(role: Role = 'SELLER') {
    const user = await prisma.user.create({
      data: {
        name: 'Negocio prueba',
        email: `biz-${randomUUID()}@example.test`,
        passwordHash: 'TEST_ONLY_NOT_A_LOGIN_HASH',
        role,
      },
      select: PUBLIC_USER_SELECT,
    });
    userIds.push(user.id);
    const grant = await prisma.$transaction((tx) => sessions.create(tx, user));
    const token = await jwt.signAsync(
      { sub: user.id, sid: grant.familyId, tokenUse: 'access' },
      { expiresIn: 300 },
    );
    return { user, token };
  }
  async function close() {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.business.deleteMany({ where: { ownerId: { in: userIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      });
      assert.equal(await prisma.business.count({ where: { ownerId: { in: userIds } } }), 0);
      assert.equal(await prisma.user.count({ where: { id: { in: userIds } } }), 0);
    } finally {
      await app.close();
    }
  }
  return { app, prisma, identity, close };
}

export function businessInput() {
  return {
    name: ' Tienda Patzi ',
    slug: `biz-${randomUUID()}`,
    email: ' COMERCIO@EXAMPLE.TEST ',
    phone: '+502 5555-0000',
    address: ' Zona 1, Patzicía ',
    description: ' Tienda de prueba ',
  };
}
