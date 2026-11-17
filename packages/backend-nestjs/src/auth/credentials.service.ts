import { ConflictException, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { User } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly usersRepository: UsersService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<User> {
    if (await this.usersRepository.findByEmail(email)) {
      throw new ConflictException('Email already registered');
    }
    if (await this.usersRepository.findByUsername(username)) {
      throw new ConflictException('Username already registered');
    }
    // The address is unverified: anyone can type any email into a sign-up form.
    return this.usersRepository.create({
      username: username,
      email: email,
      passwordHash: await this.passwordHasher.hash(password),
    });
  }

  /** The user, or `null` when the email or the password is wrong. */
  async verify(email: string, password: string): Promise<User | null> {
    const found = await this.usersRepository.findByEmail(email);
    // With no account (or no password), verify() checks a dummy hash, so the response time does not reveal which emails are registered.
    const valid = await this.passwordHasher.verify(
      password,
      found?.passwordHash,
    );
    if (!valid || !found?.passwordHash) {
      return null;
    }
    // The cost settings changed since this hash was stored
    if (this.passwordHasher.needsRehash(found.passwordHash)) {
      await this.usersRepository.updatePasswordHash(
        found.id,
        await this.passwordHasher.hash(password),
      );
    }
    return found;
  }
}
