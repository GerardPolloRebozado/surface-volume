import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'

const tracer = trace.getTracer('surface-web')

/** Keep span names low-cardinality: replace IDs that appear in real URLs. */
export function normalizedRoute(method: string, pathname: string): string {
  const route = pathname
    .replace(/[0-9a-f]{8}-[0-9a-f-]{16,}/gi, '{id}')
    .replace(/\/\d+(?=\/|$)/g, '/{id}')
  return `${method} ${route}`
}

/** One span per web request; outgoing backend calls nest underneath it. */
export async function withWebRequestSpan<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    { kind: SpanKind.SERVER, attributes: { 'http.route': name } },
    async (span) => {
      try {
        return await fn()
      } catch (error) {
        span.recordException(error as Error)
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        span.end()
      }
    },
  )
}
