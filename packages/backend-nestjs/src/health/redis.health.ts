import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly indicators: HealthIndicatorService) {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  pingCheck() {
    return this.indicators
      .check('redis')
      .attempt(async () => {
        // lazyConnect + no offline queue: open the connection explicitly first.
        if (['wait', 'end', 'closed'].includes(this.client.status)) {
          await this.client.connect();
        }
        await this.client.ping();
      })
      .withTimeout(3000);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
