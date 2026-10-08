import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { Public } from '../src/auth/public.decorator';

class ProbeDto {
  @IsString()
  @MinLength(3)
  name!: string;
}

/** Only mounted by this test module; never exposed by AppModule. */
@Controller('_test')
@Public()
class ProbeController {
  @Post('validation')
  validate(@Body() dto: ProbeDto): ProbeDto {
    return dto;
  }

  @Get('error')
  fail(): never {
    throw new Error('PRIVATE_DATABASE_PASSWORD_AND_STACK');
  }
}

let app: INestApplication;
let realApp: INestApplication | undefined;
let databaseAvailable = true;

before(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  })
    .overrideProvider(PrismaService)
    .useValue({
      ping: async () => {
        if (!databaseAvailable) throw new Error('PRIVATE_DATABASE_CONNECTION');
      },
    })
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
});

after(async () => {
  if (realApp) await realApp.close();
  if (app) await app.close();
});

test('salud responde sin exponer información privada', async () => {
  const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  assert.deepEqual(response.body, { success: true, status: 'ok', service: 'PatziShop API' });
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('readiness responde 503 si falla PostgreSQL mientras liveness sigue disponible', async () => {
  databaseAvailable = false;
  try {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
    assert.equal(response.body.error, 'DATABASE_UNAVAILABLE');
    assert.equal(response.body.success, false);
    assert(!JSON.stringify(response.body).includes('PRIVATE'));
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  } finally {
    databaseAvailable = true;
  }
});

test('404 y errores inesperados mantienen contrato sin stack ni query strings', async () => {
  const missing = await request(app.getHttpServer())
    .get('/api/v1/unknown?token=PRIVATE_QUERY')
    .expect(404);
  assert.equal(missing.body.error, 'NOT_FOUND');
  assert.equal(missing.body.path, '/api/v1/unknown');
  assert(!JSON.stringify(missing.body).includes('PRIVATE_QUERY'));
  const failure = await request(app.getHttpServer()).get('/api/v1/_test/error').expect(500);
  assert.equal(failure.body.message, 'Error interno del servidor');
  assert(!JSON.stringify(failure.body).includes('PRIVATE'));
  assert.equal(failure.body.stack, undefined);
});

test('validación acepta DTO correcto y rechaza campos extra y valores inválidos', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/_test/validation')
    .send({ name: 'PatziShop' })
    .expect(201);
  for (const payload of [{ name: 'a' }, { name: 123 }, { name: 'PatziShop', role: 'ADMIN' }]) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/_test/validation')
      .send(payload)
      .expect(400);
    assert.equal(response.body.error, 'VALIDATION_ERROR');
  }
});

test('JSON malformado devuelve 400 sin reflejar el cuerpo privado', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/v1/_test/validation')
    .type('json')
    .send('PRIVATE_BODY_NOT_JSON')
    .expect(400);
  assert.equal(response.body.error, 'BAD_REQUEST');
  assert(!JSON.stringify(response.body).includes('PRIVATE_BODY'));
});

test('CORS publica únicamente el origen configurado y permite preflight', async () => {
  const allowed = await request(app.getHttpServer())
    .options('/api/v1/health')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'GET')
    .expect(204);
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  const other = await request(app.getHttpServer())
    .get('/api/v1/health')
    .set('Origin', 'https://untrusted.test')
    .expect(200);
  assert.notEqual(other.headers['access-control-allow-origin'], 'https://untrusted.test');
});

test('Swagger publica documentación y rutas con el prefijo de la API', async () => {
  await request(app.getHttpServer()).get('/api/docs/').expect(200).expect('Content-Type', /html/u);
  const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
  assert.equal(response.body.info.title, 'PatziShop API');
  assert(response.body.paths['/api/v1/health']);
  assert(response.body.paths['/api/v1/health/ready']);
});

test('AppModule inicializa Prisma real, consulta PostgreSQL y cierra el pool', async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  realApp = module.createNestApplication({ logger: false });
  configureApp(realApp);
  await realApp.init();
  const response = await request(realApp.getHttpServer()).get('/api/v1/health/ready').expect(200);
  assert.equal(response.body.database, 'up');
  await request(realApp.getHttpServer()).get('/api/v1/_test/error').expect(404);
  await realApp.close();
  realApp = undefined;
});
