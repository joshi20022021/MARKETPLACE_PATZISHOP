import { SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/client';

export const ROLES_KEY = 'patzishop:roles';
export const Roles = (...roles: [Role, ...Role[]]) => SetMetadata(ROLES_KEY, roles);
