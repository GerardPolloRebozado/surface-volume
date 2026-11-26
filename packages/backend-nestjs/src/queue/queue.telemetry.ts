import { BullMQOtel } from 'bullmq-otel';

/** Shared BullMQ telemetry implementation: automatic queue spans + our own job payload propagation. */
export const bullmqTelemetry = new BullMQOtel({
  tracerName: 'surface-volume-backend',
  meterName: 'surface-volume-backend',
  version: '1.0.0',
  enableMetrics: true,
});
