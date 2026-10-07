import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsIP,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsIP()
  HOST!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  CORS_ORIGIN!: string;

  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  SWAGGER_ENABLED!: boolean;
}

export function validateEnvironment(env: Record<string, unknown>): Record<string, unknown> {
  const config = plainToInstance(EnvironmentVariables, {
    NODE_ENV: env.NODE_ENV ?? 'development',
    PORT: env.PORT ?? 3000,
    HOST: env.HOST ?? '127.0.0.1',
    DATABASE_URL: env.DATABASE_URL,
    CORS_ORIGIN: env.CORS_ORIGIN ?? 'http://localhost:5173',
    SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? (env.NODE_ENV === 'production' ? 'false' : 'true'),
  });
  const invalid = new Set(
    validateSync(config, { validationError: { target: false, value: false } }).map(
      (error) => error.property,
    ),
  );
  try {
    const url = new URL(config.DATABASE_URL);
    if (
      !['postgresql:', 'postgres:'].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length <= 1
    )
      invalid.add('DATABASE_URL');
  } catch {
    invalid.add('DATABASE_URL');
  }
  try {
    if (new URL(config.CORS_ORIGIN).origin !== config.CORS_ORIGIN) invalid.add('CORS_ORIGIN');
  } catch {
    invalid.add('CORS_ORIGIN');
  }
  if (invalid.size > 0)
    throw new Error(`Configuración inválida: ${[...invalid].sort().join(', ')}.`);
  return { ...env, ...config };
}
