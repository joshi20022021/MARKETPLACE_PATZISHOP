import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/** CLI utilities only. NestJS will own the application lifecycle in phase 4. */
export function createDatabaseClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Configura DATABASE_URL en backend/.env.');
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
