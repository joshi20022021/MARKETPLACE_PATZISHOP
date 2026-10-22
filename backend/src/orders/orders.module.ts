import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CartsModule } from '../carts/carts.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { OrdersController, SellerOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderTransitionsService } from './order-transitions.service';
@Module({
  imports: [DatabaseModule, CartsModule, CheckoutModule],
  controllers: [OrdersController, SellerOrdersController],
  providers: [OrdersService, OrderTransitionsService],
})
export class OrdersModule {}
