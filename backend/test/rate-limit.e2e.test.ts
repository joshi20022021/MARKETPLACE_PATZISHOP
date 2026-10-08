import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Throttle } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Public } from '../src/auth/public.decorator';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { AUTH_RATE_LIMITS } from '../src/security/rate-limit.policy';

@Controller('_quota')
class QuotaProbe {
  @Get('public')
  @Public()
  @Throttle({ default: { limit: 2, ttl: 1000, blockDuration: 1000 } })
  public() {
    return { ok: true };
  }
  @Get('protected') protected() {
    return { ok: true };
  }
}

let app: INestApplication;
const calls = { register: 0, login: 0, refresh: 0, logout: 0 };
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule], controllers: [QuotaProbe] })
    .overrideProvider(PrismaService)
    .useValue({ ping: async () => undefined })
    .overrideProvider(AuthService)
    .useValue({
      register: async () => {
        calls.register++;
        throw new BadRequestException();
      },
      login: async () => {
        calls.login++;
        throw new UnauthorizedException();
      },
      refresh: async () => {
        calls.refresh++;
        throw new UnauthorizedException();
      },
      logout: async () => {
        calls.logout++;
      },
    })
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
});
after(async () => {
  if (app) await app.close();
});

test('políticas de auth limitan cada endpoint y frenan llamadas al servicio al alcanzar su cuota', async () => {
  const expected = { register: 400, login: 401, refresh: 401, logout: 204 };
  for (const endpoint of ['register', 'login', 'refresh', 'logout'] as const) {
    const send = () =>
      request(app.getHttpServer())
        .post(`/api/v1/auth/${endpoint}`)
        .set('X-PatziShop-CSRF', '1')
        .send(
          endpoint === 'register'
            ? { name: 'Prueba', email: 'quota@example.test', password: 'Password-Test-2026!' }
            : endpoint === 'login'
              ? { email: 'quota@example.test', password: 'wrong' }
              : {},
        );
    for (let count = 0; count < AUTH_RATE_LIMITS[endpoint]; count++)
      await send().expect(expected[endpoint]);
    const blocked = await send().expect(429);
    assert.equal(calls[endpoint], AUTH_RATE_LIMITS[endpoint]);
    assert.equal(blocked.body.error, 'TOO_MANY_REQUESTS');
    assert.equal(blocked.body.success, false);
    assert(Number(blocked.headers['retry-after']) > 0);
    assert.equal(blocked.headers['cache-control'], 'no-store');
  }
});

test('rutas protegidas tienen cuota 120 y peticiones sin JWT también cuentan', async () => {
  for (let count = 0; count < 120; count++)
    await request(app.getHttpServer()).get('/api/v1/_quota/protected').expect(401);
  const blocked = await request(app.getHttpServer()).get('/api/v1/_quota/protected').expect(429);
  assert.equal(blocked.body.error, 'TOO_MANY_REQUESTS');
});

test('query strings y X-Forwarded-For falsificado no permiten reiniciar el contador', async () => {
  for (const index of [1, 2]) {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/_quota/public?variant=${index}`)
      .set('X-Forwarded-For', `192.0.2.${index}`)
      .expect(200);
    assert.equal(response.headers['x-ratelimit-limit'], '2');
    assert.equal(response.headers['x-ratelimit-remaining'], String(2 - index));
  }
  await request(app.getHttpServer())
    .get('/api/v1/_quota/public?variant=3')
    .set('X-Forwarded-For', '192.0.2.3')
    .expect(429);
  await setTimeout(1200);
  await request(app.getHttpServer()).get('/api/v1/_quota/public').expect(200);
});

test('salud sigue disponible tras agotar cuotas y CORS expone Retry-After', async () => {
  await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
  const response = await request(app.getHttpServer())
    .options('/api/v1/auth/login')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'X-PatziShop-CSRF')
    .expect(204);
  const read = await request(app.getHttpServer())
    .get('/api/v1/health')
    .set('Origin', 'http://localhost:5173')
    .expect(200);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.match(String(read.headers['access-control-expose-headers']), /Retry-After/u);
});

test('JSON de más de 32 KiB responde 413 sin reflejar el cuerpo ni invocar auth', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .set('X-PatziShop-CSRF', '1')
    .send({ name: 'PRIVATE_BODY'.repeat(4000) })
    .expect(413);
  assert.equal(response.body.error, 'PAYLOAD_TOO_LARGE');
  assert(!JSON.stringify(response.body).includes('PRIVATE_BODY'));
  assert.equal(calls.register, AUTH_RATE_LIMITS.register);
});

test('OpenAPI documenta la respuesta 429 en los endpoints auth', async () => {
  const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
  for (const endpoint of ['register', 'login', 'refresh', 'logout'])
    assert(response.body.paths[`/api/v1/auth/${endpoint}`].post.responses['429']);
});
