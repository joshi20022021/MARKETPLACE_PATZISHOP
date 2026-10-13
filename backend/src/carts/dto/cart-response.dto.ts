import { ApiProperty } from '@nestjs/swagger';
import {
  PublicProductBusiness,
  PublicProductResponse,
} from '../../products/dto/public-product-response.dto';
export class CartItemResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ type: PublicProductResponse, nullable: true })
  product!: PublicProductResponse | null;
  @ApiProperty() available!: boolean;
  @ApiProperty({ minimum: 0, maximum: 99 }) maxQuantity!: number;
  @ApiProperty({ type: String, nullable: true, enum: ['UNAVAILABLE', 'INSUFFICIENT_STOCK'] })
  issue!: 'UNAVAILABLE' | 'INSUFFICIENT_STOCK' | null;
  @ApiProperty({ type: String, nullable: true, example: '20.20' }) lineTotal!: string | null;
}
export class CartGroupResponse {
  @ApiProperty({ type: PublicProductBusiness, nullable: true })
  business!: PublicProductBusiness | null;
  @ApiProperty({ type: [CartItemResponse] }) items!: CartItemResponse[];
  @ApiProperty({ example: '20.20' }) subtotal!: string;
}
export class CartResponse {
  @ApiProperty({ type: [CartGroupResponse] }) groups!: CartGroupResponse[];
  @ApiProperty() itemCount!: number;
  @ApiProperty() quantityCount!: number;
  @ApiProperty({ example: '20.20' }) subtotal!: string;
  @ApiProperty({ example: '20.20' }) total!: string;
  @ApiProperty() hasIssues!: boolean;
}
