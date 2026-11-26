import { Public } from '@nestjs/authentication';
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisHealthIndicator } from './redis.health';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
      () => this.redis.pingCheck(),
    ]);
  }
}
