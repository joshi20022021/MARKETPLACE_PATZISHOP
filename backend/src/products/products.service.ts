import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, ProductStatus } from '../generated/prisma/client';
import { ResourceScopeService } from '../security/resource-scope.service';
import type { PublicUser } from '../users/public-user';
import { ImageStorage, discardImages } from '../media/image-storage';
import { CreateProductDto, UpdateProductDto } from './dto/product-input.dto';
import { ListProductsDto } from './dto/list-products.dto';
import {
  PRODUCT_SELECT,
  ProductListResponse,
  ProductResponse,
  productResponse,
} from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: ResourceScopeService,
    private readonly storage: ImageStorage,
  ) {}

  async create(user: PublicUser, dto: CreateProductDto): Promise<ProductResponse> {
    this.scopes.sellerBusiness(user);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const business = this.scopes.requireFound(
          await tx.business.findFirst({
            where: this.scopes.sellerBusiness(user),
            select: { id: true },
          }),
        );
        const state = await this.editable(tx, business.id, user);
        await this.activeCategory(tx, dto.categoryId);
        const stock = dto.stock ?? 0;
        const status = this.status(dto.status ?? 'INACTIVE', stock, state);
        const product = await tx.product.create({
          data: {
            businessId: business.id,
            categoryId: dto.categoryId,
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
            price: new Prisma.Decimal(dto.price),
            sku: dto.sku,
            stock,
            status,
          },
          select: PRODUCT_SELECT,
        });
        if (stock)
          await tx.inventoryMovement.create({
            data: {
              productId: product.id,
              businessId: business.id,
              type: 'IN',
              quantity: stock,
              previousStock: 0,
              newStock: stock,
              reason: 'Stock inicial del vendedor',
            },
          });
        return productResponse(product);
      });
    } catch (error) {
      return this.writeError(error);
    }
  }

  async list(user: PublicUser, query: ListProductsDto): Promise<ProductListResponse> {
    const scope = this.scopes.sellerProduct(user);
    const search = query.search?.replace(/[\\%_]/gu, '\\$&');
    const where: Prisma.ProductWhereInput = {
      AND: [
        scope,
        {
          categoryId: query.categoryId,
          status: query.status,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { sku: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      ],
    };
    const [total, products] = await this.prisma.$transaction(
      [
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({
          where,
          select: PRODUCT_SELECT,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      success: true,
      data: products.map(productResponse),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async byId(user: PublicUser, id: string): Promise<ProductResponse> {
    return productResponse(
      this.scopes.requireFound(
        await this.prisma.product.findFirst({
          where: { AND: [{ id }, this.scopes.sellerProduct(user)] },
          select: PRODUCT_SELECT,
        }),
      ),
    );
  }

  async update(user: PublicUser, id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    this.scopes.sellerProduct(user);
    if (!Object.values(dto).some((value) => value !== undefined))
      throw new BadRequestException({
        message: 'Debes enviar al menos un campo editable',
        error: 'EMPTY_UPDATE',
      });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await this.lockOwn(tx, id, user);
        const business = await this.editable(tx, current.businessId, user);
        const stock = dto.stock ?? current.stock;
        const requested =
          dto.status ??
          (current.status === 'OUT_OF_STOCK' && stock > 0 ? 'ACTIVE' : current.status);
        const status = this.status(requested, stock, business);
        if (dto.categoryId !== undefined || status !== 'INACTIVE')
          await this.activeCategory(tx, dto.categoryId ?? current.categoryId);
        const product = await tx.product.update({
          where: { id, AND: this.scopes.sellerProduct(user) },
          data: {
            categoryId: dto.categoryId,
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
            price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
            sku: dto.sku,
            stock,
            status,
          },
          select: PRODUCT_SELECT,
        });
        if (stock !== current.stock)
          await tx.inventoryMovement.create({
            data: {
              productId: id,
              businessId: current.businessId,
              type: 'ADJUSTMENT',
              quantity: stock - current.stock,
              previousStock: current.stock,
              newStock: stock,
              reason: 'Ajuste de stock del vendedor',
            },
          });
        return productResponse(product);
      });
    } catch (error) {
      return this.writeError(error);
    }
  }

  async remove(user: PublicUser, id: string): Promise<void> {
    this.scopes.sellerProduct(user);
    try {
      const urls = await this.prisma.$transaction(async (tx) => {
        const product = await this.lockOwn(tx, id, user);
        await this.editable(tx, product.businessId, user);
        await tx.inventoryMovement.deleteMany({
          where: { productId: id, businessId: product.businessId, sellerOrderId: null },
        });
        await tx.product.delete({ where: { id, AND: this.scopes.sellerProduct(user) } });
        return product.images.map((image) => image.url);
      });
      await discardImages(this.storage, urls);
    } catch (error) {
      this.writeError(error);
    }
  }

  // Row lock serializes stock writes, deletion and the later image operations.
  async lockOwn(tx: Prisma.TransactionClient, id: string, user: PublicUser) {
    this.scopes.sellerProduct(user);
    await tx.$queryRaw`SELECT p.id FROM "Product" p JOIN "Business" b ON b.id = p."businessId" WHERE p.id = ${id}::uuid AND b."ownerId" = ${user.id}::uuid FOR UPDATE OF p`;
    return this.scopes.requireFound(
      await tx.product.findFirst({
        where: { AND: [{ id }, this.scopes.sellerProduct(user)] },
        select: PRODUCT_SELECT,
      }),
    );
  }

  async editable(tx: Prisma.TransactionClient, id: string, user: PublicUser) {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${id}::uuid AND "ownerId" = ${user.id}::uuid FOR SHARE`;
    const business = this.scopes.requireFound(
      await tx.business.findFirst({
        where: { AND: [{ id }, this.scopes.sellerBusiness(user)] },
        select: { status: true },
      }),
    );
    if (!['PENDING', 'ACTIVE'].includes(business.status))
      throw new ForbiddenException({
        message: 'La tienda no permite editar productos',
        error: 'BUSINESS_NOT_EDITABLE',
      });
    return business.status;
  }

  private async activeCategory(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM "Category" WHERE id = ${id}::uuid FOR SHARE`;
    const category = await tx.category.findUnique({ where: { id }, select: { isActive: true } });
    if (!category?.isActive)
      throw new ConflictException({
        message: 'La categoría no está disponible',
        error: 'CATEGORY_UNAVAILABLE',
      });
  }

  private status(requested: ProductStatus, stock: number, business: string): ProductStatus {
    if (requested === 'INACTIVE') return 'INACTIVE';
    if (business !== 'ACTIVE')
      throw new ConflictException({
        message: 'La tienda debe estar aprobada para activar productos',
        error: 'PUBLICATION_NOT_ALLOWED',
      });
    if (requested === 'OUT_OF_STOCK' && stock > 0)
      throw new ConflictException({
        message: 'El estado no coincide con las existencias',
        error: 'STOCK_STATUS_CONFLICT',
      });
    return stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
  }

  private writeError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException({
          message: 'El slug o SKU no está disponible',
          error: 'PRODUCT_IDENTIFIER_UNAVAILABLE',
        });
      if (error.code === 'P2003')
        throw new ConflictException({
          message: 'El producto tiene referencias o la categoría no está disponible',
          error: 'PRODUCT_IN_USE',
        });
      if (error.code === 'P2025') return this.scopes.requireFound<never>(null);
    }
    throw error;
  }
}
