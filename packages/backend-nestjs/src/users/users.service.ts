import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, User } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updatePasswordHash(id: string, hash: string) {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hash },
    });
  }

  async incrementTokenVersion(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async markEmailVerified(userId: string, email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== email) {
      throw new Error(
        'Email verification failed: email changed since link was sent',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    return true;
  }
}
