import { context, type Context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const propagator = new W3CTraceContextPropagator();

/** W3C trace context carrier stored in each BullMQ job payload for the Rust runner. */
export function traceCarrier(active: Context = context.active()): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagator.inject(active, carrier, {
    set(target: unknown, key: string, value: string) {
      (target as Record<string, string>)[key] = value;
    },
  });
  return carrier;
}
