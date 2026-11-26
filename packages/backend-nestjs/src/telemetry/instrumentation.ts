import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

/**
 * Loaded with `node --require` before Nest (see the Dockerfile entrypoint), so
 * Express, Prisma's driver and ioredis are patched before they are imported.
 * Exporters, resource attributes and the propagator are configured through the
 * standard OTEL_* environment variables (see deploy/app/docker-compose.yml).
 */
const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      // Filesystem spans are extremely noisy and carry no service-level signal.
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

export const otelSdk = sdk;

export async function shutdownTelemetry(): Promise<void> {
  await sdk.shutdown();
}
