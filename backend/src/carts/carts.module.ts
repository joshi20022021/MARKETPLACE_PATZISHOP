import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
@Module({
  imports: [DatabaseModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
