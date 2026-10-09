import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SecurityModule } from '../security/security.module';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesService } from './categories.service';
import { PublicCategoriesController } from './public-categories.controller';
import { PublicCategoriesService } from './public-categories.service';

@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [AdminCategoriesController, PublicCategoriesController],
  providers: [CategoriesService, PublicCategoriesService],
})
export class CategoriesModule {}
