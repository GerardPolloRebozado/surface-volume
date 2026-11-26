export const REDACTED = '[REDACTED]';

const SENSITIVE_KEY =
  /(authorization|proxy-authorization|x-service-token|cookie|set-cookie|token|secret|password|passwd|api[_-]?key|apikey|credential|private[_-]?key)/i;

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'x-service-token',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
]);

export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers["x-service-token"]',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers["x-service-token"]',
  'headers.cookie',
  'headers["set-cookie"]',
  'headers["x-api-key"]',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'api_key',
  'credentials',
];

const MAX_LENGTH = 4096;
const MAX_DEPTH = 8;

function clip(text: string): string {
  return text.length > MAX_LENGTH
    ? `${text.slice(0, MAX_LENGTH)}…[truncated]`
    : text;
}

/** Recursively masks credential-shaped keys in objects, arrays and strings. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[depth limit]';

  if (typeof value === 'string') return clip(value);
  if (value === null || typeof value !== 'object') return value;
  if (Buffer.isBuffer(value)) return '[buffer]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1);
  }
  return result;
}

/** Redacts an HTTP header map before it is attached to a span or log record. */
export function redactHeaders(
  headers: Record<string, unknown> = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(headers)) {
    result[name] = SENSITIVE_HEADERS.has(name.toLowerCase())
      ? REDACTED
      : redact(value);
  }
  return result;
}

/** Redacts a JSON-ish body, returning a string safe to put in an attribute. */
export function redactBody(value: unknown): string {
  return JSON.stringify(redact(value)) ?? '';
}
