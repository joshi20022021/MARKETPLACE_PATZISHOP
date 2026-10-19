import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { PublicUser } from '../users/public-user';
import { PUBLIC_PRODUCT_SCOPE } from '../products/public-product-scope';
import { PUBLIC_PRODUCT_SELECT } from '../products/dto/public-product-response.dto';
import { AddCartItemDto, CartQuantityDto } from './dto/cart-input.dto';
import { CartGroupResponse, CartResponse } from './dto/cart-response.dto';
import { lockCustomerCart } from './cart-lock';
const CART_LIMIT = 50;
const QUANTITY_LIMIT = 99;
@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}
  private async transaction<T>(
    user: PublicUser,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    if (user.role !== 'CUSTOMER')
      throw new ForbiddenException({
        error: 'ROLE_FORBIDDEN',
        message: 'El carrito es para clientes',
      });
    return this.prisma.$transaction(async (tx) => {
      // Serialize all cart operations for this customer, including first creation.
      await lockCustomerCart(tx, user.id);
      return work(tx);
    });
  }
  read(user: PublicUser): Promise<CartResponse> {
    return this.transaction(user, (tx) => this.snapshot(tx, user.id));
  }
  add(user: PublicUser, input: AddCartItemDto): Promise<CartResponse> {
    return this.transaction(user, async (tx) => {
      const product = await this.purchasable(tx, input.productId);
      const cart = await tx.cart.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
        select: { id: true },
      });
      const current = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      });
      const quantity = (current?.quantity ?? 0) + input.quantity;
      this.quantity(quantity, product.stock);
      if (!current && (await tx.cartItem.count({ where: { cartId: cart.id } })) >= CART_LIMIT)
        throw new ConflictException({
          error: 'CART_LIMIT',
          message: 'El carrito admite hasta 50 productos distintos',
        });
      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
        create: { cartId: cart.id, productId: product.id, quantity },
        update: { quantity },
      });
      return this.snapshot(tx, user.id);
    });
  }
  update(user: PublicUser, id: string, input: CartQuantityDto): Promise<CartResponse> {
    return this.transaction(user, async (tx) => {
      const item = this.found(
        await tx.cartItem.findFirst({
          where: { id, cart: { userId: user.id } },
          select: { productId: true },
        }),
      );
      const product = await this.purchasable(tx, item.productId);
      this.quantity(input.quantity, product.stock);
      await tx.cartItem.update({
        where: { id, cart: { userId: user.id } },
        data: { quantity: input.quantity },
      });
      return this.snapshot(tx, user.id);
    });
  }
  remove(user: PublicUser, id: string): Promise<CartResponse> {
    return this.transaction(user, async (tx) => {
      const result = await tx.cartItem.deleteMany({ where: { id, cart: { userId: user.id } } });
      if (!result.count) this.found(null);
      return this.snapshot(tx, user.id);
    });
  }
  private found<T>(value: T | null): T {
    if (value === null)
      throw new NotFoundException({
        error: 'RESOURCE_NOT_FOUND',
        message: 'Recurso no encontrado',
      });
    return value;
  }
  private async purchasable(tx: Prisma.TransactionClient, id: string) {
    // A seller's stock update cannot interleave with validation and this cart write.
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id}::uuid FOR SHARE`;
    const product = await tx.product.findFirst({
      where: { AND: [{ id }, PUBLIC_PRODUCT_SCOPE] },
      select: { id: true, stock: true },
    });
    if (!product)
      throw new ConflictException({
        error: 'PRODUCT_UNAVAILABLE',
        message: 'Este producto ya no está disponible',
      });
    return product;
  }
  private quantity(quantity: number, stock: number) {
    if (quantity > QUANTITY_LIMIT)
      throw new ConflictException({
        error: 'QUANTITY_LIMIT',
        message: 'Cada producto admite hasta 99 unidades',
      });
    if (quantity > stock)
      throw new ConflictException({
        error: 'INSUFFICIENT_STOCK',
        message: 'La cantidad supera la disponibilidad actual',
      });
  }
  async snapshot(tx: Prisma.TransactionClient, userId: string): Promise<CartResponse> {
    const lines = await tx.cartItem.findMany({
      where: { cart: { userId } },
      select: { id: true, productId: true, quantity: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const products = await tx.product.findMany({
      where: { AND: [{ id: { in: lines.map((line) => line.productId) } }, PUBLIC_PRODUCT_SCOPE] },
      select: { ...PUBLIC_PRODUCT_SELECT, stock: true },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    const groups = new Map<string, CartGroupResponse>();
    let total = new Prisma.Decimal(0);
    let hasIssues = false;
    for (const line of lines) {
      const value = byId.get(line.productId);
      const key = value?.business.id ?? 'unavailable';
      let group = groups.get(key);
      if (!group) {
        group = { business: value?.business ?? null, items: [], subtotal: '0.00' };
        groups.set(key, group);
      }
      const maxQuantity = value ? Math.min(value.stock, QUANTITY_LIMIT) : 0;
      const issue = !value
        ? 'UNAVAILABLE'
        : line.quantity > maxQuantity
          ? 'INSUFFICIENT_STOCK'
          : null;
      const amount = value && !issue ? value.price.mul(line.quantity) : null;
      const product = value
        ? {
            id: value.id,
            name: value.name,
            slug: value.slug,
            description: value.description,
            price: value.price.toFixed(2),
            mainImage: value.mainImage,
            images: value.images,
            business: value.business,
            category: value.category,
          }
        : null;
      group.items.push({
        ...line,
        product,
        available: !issue,
        maxQuantity,
        issue,
        lineTotal: amount?.toFixed(2) ?? null,
      });
      if (amount) {
        total = total.add(amount);
        group.subtotal = new Prisma.Decimal(group.subtotal).add(amount).toFixed(2);
      }
      hasIssues ||= issue !== null;
    }
    return {
      groups: [...groups.values()],
      itemCount: lines.length,
      quantityCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: total.toFixed(2),
      total: total.toFixed(2),
      hasIssues,
    };
  }
}
