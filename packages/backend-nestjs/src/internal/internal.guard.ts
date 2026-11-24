import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from './verify-token';

@Injectable()
export class InternalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();

    if (!verifyToken(request.headers['x-service-token'], process.env.INTERNAL_SERVICE_TOKEN)) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
