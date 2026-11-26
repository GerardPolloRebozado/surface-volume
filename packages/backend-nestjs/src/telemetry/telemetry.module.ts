import { Global, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { otelLogStream } from './log-bridge';
import { PINO_REDACT_PATHS } from './redaction';
import { shutdownTelemetry } from './instrumentation';

@Injectable()
export class TelemetryLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await shutdownTelemetry();
  }
}

const pinoOptions = {
  level: process.env.OTEL_LOG_LEVEL ?? 'info',
  redact: { paths: PINO_REDACT_PATHS, censor: '[REDACTED]' },
  // pino-http's default request serializer logs all headers; keep only the route.
  serializers: {
    req: (req: { method?: string; url?: string }) => ({
      method: req.method,
      url: req.url,
    }),
  },
};

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      // One line goes to Docker stdout, the other to the OTel log pipeline (Loki).
      pinoHttp: [
        pinoOptions,
        pino.multistream([
          { stream: process.stdout },
          { stream: otelLogStream },
        ]),
      ] as never,
    }),
  ],
  providers: [TelemetryLifecycle],
  exports: [TelemetryLifecycle],
})
export class TelemetryModule {}
