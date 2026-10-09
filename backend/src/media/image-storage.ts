import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

export const MEDIA_PREFIX = '/api/v1/media/products/';
export const IMAGE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/u;
export abstract class ImageStorage {
  abstract save(webp: Buffer): Promise<string>;
  abstract read(url: string): Promise<Buffer>;
  abstract remove(url: string): Promise<void>;
}

@Injectable()
export class LocalImageStorage extends ImageStorage {
  private readonly directory = resolve(process.cwd(), 'uploads', 'product-images');
  async save(webp: Buffer): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const key = `${randomUUID()}.webp`;
    const path = resolve(this.directory, key);
    try {
      await writeFile(path, webp, { flag: 'wx' });
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST'))
        await unlink(path).catch(() => undefined);
      throw error;
    }
    return `${MEDIA_PREFIX}${key}`;
  }
  async read(url: string): Promise<Buffer> {
    const key = this.key(url);
    try {
      return await readFile(resolve(this.directory, key));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        throw new NotFoundException();
      throw error;
    }
  }
  async remove(url: string): Promise<void> {
    if (!url.startsWith(MEDIA_PREFIX) || !IMAGE_KEY.test(url.slice(MEDIA_PREFIX.length))) return;
    try {
      await unlink(resolve(this.directory, this.key(url)));
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error;
    }
  }
  private key(url: string): string {
    const key = url.startsWith(MEDIA_PREFIX) ? url.slice(MEDIA_PREFIX.length) : '';
    if (!IMAGE_KEY.test(key)) throw new NotFoundException();
    return key;
  }
}

export async function discardImages(storage: ImageStorage, urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      await storage.remove(url);
    } catch {
      new Logger('ImageCleanup').warn(
        'No se pudo eliminar un archivo de imagen; requiere revisión del almacenamiento.',
      );
    }
  }
}
