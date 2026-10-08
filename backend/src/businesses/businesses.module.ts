import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { BusinessesService } from './businesses.service';
import { SellerBusinessController } from './seller-business.controller';

@Module({
  imports: [DatabaseModule, SecurityModule],
  providers: [BusinessesService],
  controllers: [SellerBusinessController],
})
export class BusinessesModule {}
