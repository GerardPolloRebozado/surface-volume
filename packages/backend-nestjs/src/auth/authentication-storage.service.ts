import { Injectable } from '@nestjs/common';
import {
  AuthenticationStorage,
  type EmailTokenPurpose,
  type EmailTokenRecord,
  type EmailTokenStore,
  type RefreshTokenRecord,
  type RefreshTokenStore,
} from '@nestjs/authentication';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

const EMAIL_TOKEN_LIMIT = 10_000;

@Injectable()
export class AuthenticationStorageService
  implements RefreshTokenStore, EmailTokenStore
{
  constructor(
    private readonly prisma: PrismaService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({
      refreshTokens: this,
      emailTokens: this,
    });
  }

  async getRefreshToken(
    id: string,
  ): Promise<RefreshTokenRecord | undefined> {
    const token = await this.prisma.authenticationRefreshToken.findUnique({
      where: { id },
    });
    if (!token) return undefined;

    return {
      id: token.id,
      familyId: token.familyId,
      userId: token.userId,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      familyExpiresAt: token.familyExpiresAt,
      ...(token.usedAt ? { usedAt: token.usedAt } : {}),
      ...(token.claims &&
      typeof token.claims === 'object' &&
      !Array.isArray(token.claims)
        ? { claims: token.claims as Record<string, unknown> }
        : {}),
    };
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authenticationRefreshToken.deleteMany({
        where: { familyExpiresAt: { lte: record.createdAt } },
      }),
      this.prisma.authenticationRefreshToken.create({
        data: {
          id: record.id,
          familyId: record.familyId,
          userId: record.userId,
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
          familyExpiresAt: record.familyExpiresAt,
          usedAt: record.usedAt ?? null,
          claims: record.claims
            ? (record.claims as Prisma.InputJsonValue)
            : undefined,
        },
      }),
    ]);
  }

  async markRefreshTokenUsed(id: string, at: Date): Promise<boolean> {
    const result = await this.prisma.authenticationRefreshToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: at },
    });
    return result.count === 1;
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    const token = await this.prisma.authenticationRefreshToken.findFirst({
      where: { familyId },
      select: { userId: true },
    });
    if (!token) return;

    await this.prisma.authenticationRefreshTokenFamily.upsert({
      where: { familyId },
      update: {},
      create: {
        familyId,
        userId: token.userId,
        revokedAt: new Date(),
      },
    });
  }

  async isRefreshTokenFamilyRevoked(familyId: string): Promise<boolean> {
    return (
      (await this.prisma.authenticationRefreshTokenFamily.count({
        where: { familyId },
      })) > 0
    );
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    const families = await this.prisma.authenticationRefreshToken.findMany({
      where: { userId },
      select: { familyId: true },
      distinct: ['familyId'],
    });

    await this.prisma.authenticationRefreshTokenFamily.createMany({
      data: families.map(({ familyId }) => ({
        familyId,
        userId,
        revokedAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  async saveEmailToken(record: EmailTokenRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.authenticationEmailToken.deleteMany({
        where: { expiresAt: { lte: record.createdAt } },
      });
      await tx.authenticationEmailToken.create({
        data: {
          id: record.id,
          purpose: record.purpose,
          userId: record.userId,
          email: record.email,
          fingerprint: record.fingerprint ?? null,
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
        },
      });

      const excess = await tx.authenticationEmailToken.count();
      if (excess > EMAIL_TOKEN_LIMIT) {
        const toDelete = await tx.authenticationEmailToken.findMany({
          orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
          take: excess - EMAIL_TOKEN_LIMIT,
          select: { id: true },
        });
        await tx.authenticationEmailToken.deleteMany({
          where: { id: { in: toDelete.map(({ id }) => id) } },
        });
      }
    });
  }

  async consumeEmailToken(
    id: string,
    purpose: EmailTokenPurpose,
  ): Promise<EmailTokenRecord | undefined> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        purpose: string;
        user_id: string;
        email: string;
        fingerprint: string | null;
        created_at: Date;
        expires_at: Date;
      }>
    >`
      DELETE FROM authentication_email_tokens
      WHERE id = ${id} AND purpose = ${purpose}
      RETURNING id, purpose, user_id, email, fingerprint, created_at, expires_at
    `;
    const token = rows[0];
    if (!token) return undefined;

    return {
      id: token.id,
      purpose: token.purpose as EmailTokenPurpose,
      userId: token.user_id,
      email: token.email,
      ...(token.fingerprint ? { fingerprint: token.fingerprint } : {}),
      createdAt: token.created_at,
      expiresAt: token.expires_at,
    };
  }

  async deleteUserEmailTokens(
    userId: string,
    purpose: EmailTokenPurpose,
  ): Promise<void> {
    await this.prisma.authenticationEmailToken.deleteMany({
      where: { userId, purpose },
    });
  }
}
