import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { BusinessesService } from './businesses.service';
import { SellerBusinessController } from './seller-business.controller';
import { PublicBusinessesController } from './public-businesses.controller';
import { PublicBusinessesService } from './public-businesses.service';

@Module({
  imports: [DatabaseModule, SecurityModule],
  providers: [BusinessesService, PublicBusinessesService],
  controllers: [SellerBusinessController, PublicBusinessesController],
})
export class BusinessesModule {}
