import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { CSRF_HEADER } from './auth.constants';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'GET') return true;
    const origin = request.get('origin');
    const allowed = this.config.getOrThrow<string>('CORS_ORIGIN');
    const sameOrigin = `${request.protocol}://${request.get('host')}`;
    if (
      request.get(CSRF_HEADER) !== '1' ||
      (origin !== undefined && origin !== allowed && origin !== sameOrigin)
    ) {
      throw new ForbiddenException({
        message: 'Origen o encabezado de autenticación inválido',
        error: 'CSRF_REJECTED',
      });
    }
    return true;
  }
}
