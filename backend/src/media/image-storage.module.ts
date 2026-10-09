import { Module } from '@nestjs/common';
import { ImageStorage, LocalImageStorage } from './image-storage';
@Module({
  providers: [{ provide: ImageStorage, useClass: LocalImageStorage }],
  exports: [ImageStorage],
})
export class ImageStorageModule {}
