import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { ProductsService } from './products.service';
import { SellerProductsController } from './seller-products.controller';
import { ImageStorageModule } from '../media/image-storage.module';
import { ProductImagesController, ProductMediaController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';
@Module({
  imports: [DatabaseModule, SecurityModule, ImageStorageModule],
  controllers: [SellerProductsController, ProductImagesController, ProductMediaController],
  providers: [ProductsService, ProductImagesService],
})
export class ProductsModule {}
