import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../database/prisma.service';
import { ImageStorage, discardImages, IMAGE_KEY, MEDIA_PREFIX } from '../media/image-storage';
import { ResourceScopeService } from '../security/resource-scope.service';
import type { PublicUser } from '../users/public-user';
import { PRODUCT_SELECT, ProductResponse, productResponse } from './dto/product-response.dto';
import { ProductsService } from './products.service';

export const MAX_PRODUCT_IMAGES = 6;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const types: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly scopes: ResourceScopeService,
    private readonly storage: ImageStorage,
  ) {}

  async upload(
    user: PublicUser,
    id: string,
    file: Express.Multer.File | undefined,
  ): Promise<ProductResponse> {
    if (!file)
      throw new BadRequestException({
        message: 'Debes enviar un archivo en file',
        error: 'IMAGE_REQUIRED',
      });
    await this.prisma.$transaction(async (tx) => {
      const product = await this.products.lockOwn(tx, id, user);
      await this.products.editable(tx, product.businessId, user);
      this.capacity(product.images.length);
    });
    const normalized = await this.normalize(file);
    const url = await this.storage.save(normalized);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await this.products.lockOwn(tx, id, user);
        await this.products.editable(tx, product.businessId, user);
        this.capacity(product.images.length);
        const position = product.images.length
          ? Math.max(...product.images.map((image) => image.position)) + 1
          : 0;
        await tx.productImage.create({ data: { productId: id, url, position } });
        return productResponse(
          await tx.product.update({
            where: { id, AND: this.scopes.sellerProduct(user) },
            data: { mainImage: product.images[0]?.url ?? url },
            select: PRODUCT_SELECT,
          }),
        );
      });
    } catch (error) {
      await discardImages(this.storage, [url]);
      throw error;
    }
  }

  async remove(user: PublicUser, id: string, imageId: string): Promise<void> {
    const url = await this.prisma.$transaction(async (tx) => {
      const product = await this.products.lockOwn(tx, id, user);
      await this.products.editable(tx, product.businessId, user);
      const image = this.scopes.requireFound(
        product.images.find((value) => value.id === imageId) ?? null,
      );
      await tx.productImage.delete({
        where: { id: imageId, productId: id, product: this.scopes.sellerProduct(user) },
      });
      const remaining = product.images.filter((value) => value.id !== imageId);
      await tx.product.update({
        where: { id, AND: this.scopes.sellerProduct(user) },
        data: { mainImage: remaining[0]?.url ?? null },
      });
      return image.url;
    });
    await discardImages(this.storage, [url]);
  }

  async ownFile(user: PublicUser, id: string, imageId: string): Promise<Buffer> {
    const product = await this.products.byId(user, id);
    const image = this.scopes.requireFound(
      product.images.find((value) => value.id === imageId) ?? null,
    );
    return this.storage.read(image.url);
  }

  async publicFile(key: string): Promise<Buffer> {
    if (!IMAGE_KEY.test(key)) return this.scopes.requireFound<never>(null);
    const url = `${MEDIA_PREFIX}${key}`;
    this.scopes.requireFound(
      await this.prisma.productImage.findFirst({
        where: {
          url,
          product: {
            status: 'ACTIVE',
            stock: { gt: 0 },
            category: { isActive: true },
            business: { status: 'ACTIVE', owner: { isActive: true, role: 'SELLER' } },
          },
        },
        select: { id: true },
      }),
    );
    return this.storage.read(url);
  }

  private capacity(count: number): void {
    if (count >= MAX_PRODUCT_IMAGES)
      throw new ConflictException({
        message: 'El producto admite hasta seis imágenes',
        error: 'IMAGE_LIMIT_REACHED',
      });
  }

  private async normalize(file: Express.Multer.File): Promise<Buffer> {
    const data = file.buffer;
    const jpeg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    const png =
      data.length >= 8 &&
      data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      data.length >= 12 &&
      data.toString('ascii', 0, 4) === 'RIFF' &&
      data.toString('ascii', 8, 12) === 'WEBP';
    if (!jpeg && !png && !webp)
      throw new UnsupportedMediaTypeException({
        message: 'Solo se admiten JPEG, PNG y WebP',
        error: 'IMAGE_FORMAT_UNSUPPORTED',
      });
    try {
      const image = sharp(data, { limitInputPixels: 16000000, failOn: 'warning' });
      const metadata = await image.metadata();
      if (
        !metadata.format ||
        types[metadata.format] !== file.mimetype ||
        (metadata.pages ?? 1) !== 1
      )
        throw new Error('Invalid format');
      return await image
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException({
        message: 'La imagen no es válida, es animada o supera 16 millones de píxeles',
        error: 'IMAGE_INVALID',
      });
    }
  }
}
