import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { ProductsService } from './products.service';
import { SellerProductsController } from './seller-products.controller';
import { ImageStorageModule } from '../media/image-storage.module';
import { ProductImagesController, ProductMediaController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';
import { PublicProductsController } from './public-products.controller';
import { PublicProductsService } from './public-products.service';
@Module({
  imports: [DatabaseModule, SecurityModule, ImageStorageModule],
  controllers: [
    SellerProductsController,
    ProductImagesController,
    ProductMediaController,
    PublicProductsController,
  ],
  providers: [ProductsService, ProductImagesService, PublicProductsService],
})
export class ProductsModule {}
