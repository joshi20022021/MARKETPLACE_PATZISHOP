import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { ProductsService } from './products.service';
import { SellerProductsController } from './seller-products.controller';
@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [SellerProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
