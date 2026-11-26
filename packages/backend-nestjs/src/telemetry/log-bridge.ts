import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { Writable } from 'node:stream';

const logger = logs.getLogger('surface-volume-backend');

const SEVERITY: Record<number, SeverityNumber> = {
  10: SeverityNumber.TRACE,
  20: SeverityNumber.DEBUG,
  30: SeverityNumber.INFO,
  40: SeverityNumber.WARN,
  50: SeverityNumber.ERROR,
  60: SeverityNumber.FATAL,
};

/**
 * pino prints JSON to stdout (Docker logs), but the OTel log exporter only sees
 * records emitted through the Logs API. This stream bridges the two so logs end
 * up in Loki with the trace_id/span_id that the pino instrumentation injects.
 */
export const otelLogStream = new Writable({
  write(chunk, _encoding, callback) {
    try {
      const line = chunk.toString().trim();
      if (line) {
        const record = JSON.parse(line) as Record<string, unknown>;
        const attributes: Record<string, string | number | boolean> = {};
        for (const key of [
          'trace_id',
          'span_id',
          'trace_flags',
          'context',
          'service',
        ]) {
          const value = record[key];
          if (value !== undefined && typeof value !== 'object') {
            attributes[key] = value as string | number | boolean;
          }
        }
        if (record.req && typeof record.req === 'object') {
          const req = record.req as Record<string, unknown>;
          if (req.method) attributes['http.request.method'] = String(req.method);
          if (req.url) attributes['url.path'] = String(req.url);
        }

        logger.emit({
          severityNumber: SEVERITY[Number(record.level)] ?? SeverityNumber.INFO,
          severityText: String(record.level ?? 'info'),
          body: String(record.msg ?? line),
          attributes,
        });
      }
    } catch {
      // Never let telemetry break application logging.
    }
    callback();
  },
});
