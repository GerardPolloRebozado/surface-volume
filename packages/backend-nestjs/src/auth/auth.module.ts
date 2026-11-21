import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { JwtAuth } from './jwt-auth.provider.js';
import { EmailVerificationMailer } from './email-verification.mailer.js';
import { EmailVerificationController } from './email-verification.controller.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController, EmailVerificationController],
  providers: [
    JwtAuth,
    CredentialsService,
    EmailVerificationMailer,
    TokenService,
  ],
  exports: [JwtAuth, TokenService],
})
export class AuthModule {}
