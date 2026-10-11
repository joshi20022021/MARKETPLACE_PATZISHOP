import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ResourceScopeService } from '../security/resource-scope.service';
import { Prisma } from '../generated/prisma/client';
import { PUBLIC_PRODUCT_SCOPE } from './public-product-scope';
import { ListPublicProductsDto } from './dto/list-public-products.dto';
import {
  PUBLIC_PRODUCT_SELECT,
  PublicProductListResponse,
  PublicProductResponse,
} from './dto/public-product-response.dto';
type Selected = Prisma.ProductGetPayload<{ select: typeof PUBLIC_PRODUCT_SELECT }>;
const serialize = (product: Selected): PublicProductResponse => ({
  ...product,
  price: product.price.toFixed(2),
});
@Injectable()
export class PublicProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
  ) {}
  async list(query: ListPublicProductsDto): Promise<PublicProductListResponse> {
    const min = query.minPrice === undefined ? undefined : new Prisma.Decimal(query.minPrice);
    const max = query.maxPrice === undefined ? undefined : new Prisma.Decimal(query.maxPrice);
    if (min && max && min.gt(max))
      throw new BadRequestException({
        error: 'INVALID_PRICE_RANGE',
        message: 'El precio mínimo no puede superar al máximo',
      });
    const search = query.search?.replace(/[\\%_]/gu, '\\$&');
    const where: Prisma.ProductWhereInput = {
      AND: [
        PUBLIC_PRODUCT_SCOPE,
        {
          categoryId: query.categoryId,
          ...(query.businessSlug ? { business: { slug: query.businessSlug } } : {}),
          ...(min || max ? { price: { gte: min, lte: max } } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      ],
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'newest'
        ? [{ createdAt: 'desc' }, { id: 'desc' }]
        : [{ price: query.sort === 'price-asc' ? 'asc' : 'desc' }, { id: 'asc' }];
    const [total, products] = await this.prisma.$transaction(
      async (tx) => {
        const total = await tx.product.count({ where });
        const products = await tx.product.findMany({
          where,
          select: PUBLIC_PRODUCT_SELECT,
          orderBy,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        });
        return [total, products] as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      success: true,
      data: products.map(serialize),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async bySlug(slug: string): Promise<PublicProductResponse> {
    return serialize(
      this.scopes.requireFound(
        await this.prisma.product.findFirst({
          where: { AND: [{ slug }, PUBLIC_PRODUCT_SCOPE] },
          select: PUBLIC_PRODUCT_SELECT,
        }),
      ),
    );
  }
}
