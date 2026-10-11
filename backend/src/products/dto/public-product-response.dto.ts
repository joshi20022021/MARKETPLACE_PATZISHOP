import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '../../generated/prisma/client';
import { ProductPageMeta } from './product-response.dto';
export const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  mainImage: true,
  images: { select: { url: true, position: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }] },
  business: { select: { id: true, name: true, slug: true, logo: true } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;
export class PublicProductCategory {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}
export class PublicProductBusiness extends PublicProductCategory {
  @ApiProperty({ type: String, nullable: true }) logo!: string | null;
}
export class PublicProductImage {
  @ApiProperty() url!: string;
  @ApiProperty() position!: number;
}
export class PublicProductResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: String, example: '125.50' }) price!: string;
  @ApiProperty({ type: String, nullable: true }) mainImage!: string | null;
  @ApiProperty({ type: [PublicProductImage] }) images!: PublicProductImage[];
  @ApiProperty({ type: PublicProductBusiness }) business!: PublicProductBusiness;
  @ApiProperty({ type: PublicProductCategory }) category!: PublicProductCategory;
}
export class PublicProductListResponse {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: [PublicProductResponse] }) data!: PublicProductResponse[];
  @ApiProperty({ type: ProductPageMeta }) meta!: ProductPageMeta;
}
