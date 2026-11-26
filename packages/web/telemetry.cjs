// Preloaded with `node --require ./telemetry.cjs` before the Astro SSR entry.
// Exporters and resource attributes come from the standard OTEL_* env vars.
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
})

sdk.start()

const shutdown = () => {
  sdk.shutdown().finally(() => process.exit(0))
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)
