import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { ApiThrottleGuard } from './security/api-throttle.guard';
import { API_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from './security/rate-limit.policy';
import { BusinessesModule } from './businesses/businesses.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment, envFilePath: '.env' }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: RATE_LIMIT_WINDOW_MS, limit: API_RATE_LIMIT },
    ]),
    HealthModule,
    AuthModule,
    SecurityModule,
    BusinessesModule,
    CategoriesModule,
    ProductsModule,
  ],
  providers: [
    ApiThrottleGuard,
    { provide: APP_GUARD, useExisting: ApiThrottleGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
