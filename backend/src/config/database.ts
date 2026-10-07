import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export function createDatabaseAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
}

/** CLI utilities; the API uses PrismaService for its lifecycle. */
export function createDatabaseClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Configura DATABASE_URL en backend/.env.');
  const adapter = createDatabaseAdapter(connectionString);
  return new PrismaClient({ adapter });
}
