import { Prisma } from '../generated/prisma/client';
// Catalog and media must apply the same publication rules.
export const PUBLIC_PRODUCT_SCOPE = {
  status: 'ACTIVE',
  stock: { gt: 0 },
  category: { isActive: true },
  business: { status: 'ACTIVE', owner: { isActive: true, role: 'SELLER' } },
} satisfies Prisma.ProductWhereInput;
