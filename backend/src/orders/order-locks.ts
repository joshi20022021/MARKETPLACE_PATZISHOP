import { Prisma } from '../generated/prisma/client';
const TABLES = {
  Product: Prisma.sql`"Product"`,
  Business: Prisma.sql`"Business"`,
  Category: Prisma.sql`"Category"`,
  User: Prisma.sql`"User"`,
};
export async function lockOrderRows(
  tx: Prisma.TransactionClient,
  table: keyof typeof TABLES,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const values = [...new Set(ids)].map((id) => Prisma.sql`${id}::uuid`);
  const mode = table === 'Product' ? Prisma.sql`FOR UPDATE` : Prisma.sql`FOR SHARE`;
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM ${TABLES[table]} WHERE id IN (${Prisma.join(values)}) ORDER BY id ${mode}`,
  );
}
