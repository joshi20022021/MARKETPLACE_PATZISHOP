import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { PUBLIC_USER_SELECT, PublicUser } from '../users/public-user';
import { invalidSession } from './auth.errors';

export interface SessionGrant {
  refreshToken: string;
  familyId: string;
  expiresAt: Date;
  user: PublicUser;
}

@Injectable()
export class RefreshTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private digest(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  async create(tx: Prisma.TransactionClient, user: PublicUser): Promise<SessionGrant> {
    const familyId = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.config.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS') * 86400000,
    );
    return this.insert(tx, user, familyId, expiresAt);
  }

  private async insert(
    tx: Prisma.TransactionClient,
    user: PublicUser,
    familyId: string,
    expiresAt: Date,
  ): Promise<SessionGrant> {
    const refreshToken = randomBytes(32).toString('base64url');
    await tx.refreshToken.create({
      data: { userId: user.id, familyId, expiresAt, tokenHash: this.digest(refreshToken) },
    });
    return { refreshToken, familyId, expiresAt, user };
  }

  private async lock(tx: Prisma.TransactionClient, familyId: string): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${familyId}::text, 0))::text`;
  }

  private async known(token: string | undefined) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/u.test(token)) return null;
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.digest(token) },
      select: { tokenHash: true, familyId: true },
    });
  }

  async rotate(token: string | undefined): Promise<SessionGrant> {
    const known = await this.known(token);
    if (!known) throw invalidSession();
    const grant = await this.prisma.$transaction(
      async (tx) => {
        await this.lock(tx, known.familyId);
        const current = await tx.refreshToken.findUnique({
          where: { tokenHash: known.tokenHash },
          include: { user: { select: { ...PUBLIC_USER_SELECT, isActive: true } } },
        });
        const now = new Date();
        if (!current || current.revokedAt || current.expiresAt <= now || !current.user.isActive) {
          // Commit revocation before returning 401; throwing here would roll it back.
          await tx.refreshToken.updateMany({
            where: { familyId: known.familyId, revokedAt: null },
            data: { revokedAt: now },
          });
          return null;
        }
        const user = {
          id: current.user.id,
          name: current.user.name,
          email: current.user.email,
          role: current.user.role,
        };
        const replacement = await this.insert(tx, user, current.familyId, current.expiresAt);
        const next = await tx.refreshToken.findUniqueOrThrow({
          where: { tokenHash: this.digest(replacement.refreshToken) },
          select: { id: true },
        });
        await tx.refreshToken.update({
          where: { id: current.id },
          data: { revokedAt: now, replacedById: next.id },
        });
        return replacement;
      },
      { timeout: 10000 },
    );
    if (!grant) throw invalidSession();
    return grant;
  }

  async revoke(token: string | undefined): Promise<void> {
    const known = await this.known(token);
    if (!known) return;
    await this.prisma.$transaction(
      async (tx) => {
        await this.lock(tx, known.familyId);
        await tx.refreshToken.updateMany({
          where: { familyId: known.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      },
      { timeout: 10000 },
    );
  }

  async activeUser(userId: string, familyId: string): Promise<PublicUser | null> {
    const session = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        familyId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { isActive: true },
      },
      select: { user: { select: PUBLIC_USER_SELECT } },
    });
    return session?.user ?? null;
  }
}
