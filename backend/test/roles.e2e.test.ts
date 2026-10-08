import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { Public } from '../src/auth/public.decorator';
import { Roles } from '../src/auth/roles.decorator';
import { securityContext } from './security-test-context';

// Never imported into the production application.
@Controller('_security')
@Roles('ADMIN')
class RoleProbe {
  @Get('admin') admin() {
    return { allowed: true };
  }
  @Get('seller') @Roles('SELLER') seller() {
    return { allowed: true };
  }
  @Get('customer') @Roles('CUSTOMER') customer() {
    return { allowed: true };
  }
  @Get('shared') @Roles('ADMIN', 'SELLER') shared() {
    return { allowed: true };
  }
}

@Controller('_default')
class DefaultProbe {
  @Get() protected() {
    return { allowed: true };
  }
  @Get('public') @Public() public() {
    return { allowed: true };
  }
  @Get('misconfigured') @Public() @Roles('ADMIN') misconfigured() {
    return { allowed: true };
  }
}

let context: Awaited<ReturnType<typeof securityContext>>;
before(async () => {
  context = await securityContext([RoleProbe, DefaultProbe]);
});
after(async () => {
  if (context) await context.close();
});
const get = (path: string, token: string) =>
  request(context.app.getHttpServer()).get(`/api/v1/${path}`).auth(token, { type: 'bearer' });

test('ruta sin decorators exige JWT, y Public permite invitados de forma explícita', async () => {
  await request(context.app.getHttpServer()).get('/api/v1/_default').expect(401);
  for (const token of Object.values(context.tokens)) await get('_default', token).expect(200);
  await request(context.app.getHttpServer()).get('/api/v1/_default/public').expect(200);
  await get('_default/misconfigured', context.tokens.admin).expect(401);
});

test('matriz ADMIN SELLER CUSTOMER aplica roles exactos sin herencia administrativa', async () => {
  for (const role of ['admin', 'seller', 'customer'] as const) {
    await request(context.app.getHttpServer()).get(`/api/v1/_security/${role}`).expect(401);
    for (const identity of ['admin', 'seller', 'customer'] as const) {
      const response = await get(`_security/${role}`, context.tokens[identity]).expect(
        role === identity ? 200 : 403,
      );
      if (response.status === 403) assert.equal(response.body.error, 'ROLE_FORBIDDEN');
    }
  }
  await get('_security/shared', context.tokens.admin).expect(200);
  await get('_security/shared', context.tokens.seller).expect(200);
  await get('_security/shared', context.tokens.customer).expect(403);
});

test('cambiar rol en BD afecta el permiso del JWT ya emitido inmediatamente', async () => {
  await context.prisma.user.update({
    where: { id: context.seller.id },
    data: { role: 'CUSTOMER' },
  });
  try {
    await get('_security/seller', context.tokens.seller).expect(403);
    await get('_security/customer', context.tokens.seller).expect(200);
  } finally {
    await context.prisma.user.update({
      where: { id: context.seller.id },
      data: { role: 'SELLER' },
    });
  }
});

test('usuario desactivado o sesión revocada recibe 401 antes de evaluar rol', async () => {
  await context.prisma.user.update({ where: { id: context.admin.id }, data: { isActive: false } });
  await get('_security/admin', context.tokens.admin).expect(401);
  await context.prisma.user.update({ where: { id: context.admin.id }, data: { isActive: true } });
  await context.prisma.refreshToken.updateMany({
    where: { userId: context.admin.id },
    data: { revokedAt: new Date() },
  });
  await get('_security/admin', context.tokens.admin).expect(401);
});

test('AppModule de producción no monta rutas de prueba ni CRUD de fases posteriores', async () => {
  const compiled = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = compiled.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  try {
    for (const path of ['_security/admin', '_default', 'products'])
      await request(app.getHttpServer()).get(`/api/v1/${path}`).expect(404);
    const swagger = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    assert(
      !Object.keys(swagger.body.paths).some(
        (path) => path.includes('_security') || path.includes('_default'),
      ),
    );
  } finally {
    await app.close();
  }
});
