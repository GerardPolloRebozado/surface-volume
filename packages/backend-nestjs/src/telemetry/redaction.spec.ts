import { context, propagation, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { traceCarrier } from './propagation';
import { redact, redactBody, redactHeaders, REDACTED } from './redaction';

describe('telemetry redaction', () => {
  it('masks credential-shaped keys recursively', () => {
    const result = redact({
      authorization: 'Bearer abc',
      nested: { apiKey: 'secret', keep: 'visible' },
      list: [{ password: 'hunter2' }],
    }) as Record<string, any>;

    expect(result.authorization).toBe(REDACTED);
    expect(result.nested.apiKey).toBe(REDACTED);
    expect(result.nested.keep).toBe('visible');
    expect(result.list[0].password).toBe(REDACTED);
  });

  it('masks sensitive headers but keeps harmless ones', () => {
    expect(
      redactHeaders({ 'x-service-token': 'abc', 'content-type': 'application/json' }),
    ).toEqual({ 'x-service-token': REDACTED, 'content-type': 'application/json' });
  });

  it('caps large payloads', () => {
    const body = redactBody({ note: 'x'.repeat(10_000) });
    expect(body.length).toBeLessThan(5000);
    expect(body).toContain('[truncated]');
  });
});

describe('trace propagation into BullMQ jobs', () => {
  beforeAll(() => {
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  });

  it('injects a W3C traceparent into the job carrier', () => {
    const ctx = trace.setSpanContext(context.active(), {
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: 1,
    });
    const carrier = traceCarrier(ctx);

    expect(carrier['traceparent']).toBe(
      '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    );
  });
});
