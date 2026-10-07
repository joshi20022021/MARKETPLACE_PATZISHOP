import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PUBLIC_USER_SELECT } from './public-user';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findForLogin(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...PUBLIC_USER_SELECT, passwordHash: true, isActive: true },
    });
  }
}
