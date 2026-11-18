import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { UsersService } from '../users/users.service';
import { User } from '../generated/prisma/client';

@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly usersRepository: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  validate(claims: JwtClaims): Promise<User | null> {
    if (!claims.sub || claims.scope !== 'access') {
      return Promise.resolve(null);
    }
    return this.usersRepository.findById(claims.sub);
  }
}
