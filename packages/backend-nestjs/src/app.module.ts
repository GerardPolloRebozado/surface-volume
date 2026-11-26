import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PingController } from './ping/ping.controller';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { AuthenticationModule } from '@nestjs/authentication';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import {
  FileTemplateEngine,
  LogMailTransport,
  MailModule,
  SmtpTransport,
} from '@nestjs/mail';
import { join } from 'node:path';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from './queue/queue.module';
import { WorkflowsModule } from './workflow/workflows.module';
import { AppsModule } from './apps/apps.module';
import { ConnectionsModule } from './connections/connections.module';
import { InternalModule } from './internal/internal.module';
import { HooksModule } from './hooks/hooks.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { HealthModule } from './health/health.module';
import { bullmqTelemetry } from './queue/queue.telemetry';

const crons = process.env.DISABLE_CRONS === '1' ? [] : [ScheduleModule.forRoot()];

@Module({
  imports: [
    // First import = last to shut down, so pending OTLP batches are flushed.
    TelemetryModule,
    ...crons,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailModule.forRootAsync({
      useFactory: () => ({
        // Your provider in production. In development, each email (links included) is printed to the log.
        transport: process.env.SMTP_URL
          ? new SmtpTransport({ url: process.env.SMTP_URL })
          : new LogMailTransport(),
        templates: new FileTemplateEngine({
          dir: join(__dirname, 'mail/templates'),
        }),
        from: 'Accounts <accounts@example.com>',
      }),
    }),
    AuthenticationModule.forRoot({
      accessToken: {
        key:
          process.env.JWT_SECRET ??
          'a-very-secret-key-at-least-32-bytes-long-for-jwt-signing!',
        ttl: '15m',
      },
      emailVerification: {
        url: `${process.env.APP_URL ?? 'http://localhost:8080'}/verify-email`,
      },
    }),
    UsersModule,
    AuthModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
      },
      telemetry: bullmqTelemetry,
    }),
    QueueModule,
    AppsModule,
    ConnectionsModule,
    WorkflowsModule,
    InternalModule,
    HooksModule,
    HealthModule,
  ],
  controllers: [AppController, PingController],
  providers: [AppService],
})
export class AppModule {
  static setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
      .setTitle('Surface Volume API')
      .setDescription(
        'Surface Volume automation platform API - OpenAPI spec for Kotlin Multiplatform client generation',
      )
      .setVersion('1.0')
      .addTag('surface-volume')
      .addTag('ping')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }
}
