import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '../../generated/prisma/client';
import { ProductStatus } from '../../generated/prisma/enums';
export const PRODUCT_SELECT = {
  id: true,
  businessId: true,
  categoryId: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  stock: true,
  sku: true,
  status: true,
  mainImage: true,
  createdAt: true,
  updatedAt: true,
  images: { select: { id: true, url: true, position: true }, orderBy: { position: 'asc' } },
} satisfies Prisma.ProductSelect;
export type SelectedProduct = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;
export function productResponse(product: SelectedProduct): ProductResponse {
  return { ...product, price: product.price.toFixed(2) };
}
export class ProductImageResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() position!: number;
}
export class ProductResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) businessId!: string;
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: String, example: '125.50' }) price!: string;
  @ApiProperty() stock!: number;
  @ApiProperty() sku!: string;
  @ApiProperty({ enum: ProductStatus }) status!: ProductStatus;
  @ApiProperty({ type: String, nullable: true }) mainImage!: string | null;
  @ApiProperty({ type: [ProductImageResponse] }) images!: ProductImageResponse[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
}
export class ProductPageMeta {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
export class ProductListResponse {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: [ProductResponse] }) data!: ProductResponse[];
  @ApiProperty({ type: ProductPageMeta }) meta!: ProductPageMeta;
}
