import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../generated/prisma/client';
import type { PublicUser } from '../users/public-user';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<readonly Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: PublicUser }>().user;
    if (!user) throw new UnauthorizedException();
    if (!roles.includes(user.role))
      throw new ForbiddenException({
        message: 'No tienes permiso para esta operación',
        error: 'ROLE_FORBIDDEN',
      });
    return true;
  }
}
