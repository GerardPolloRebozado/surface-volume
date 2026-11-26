# ADR 0012 — Self-hosted OpenTelemetry and Grafana stack

- Status: **Accepted**
- Date: 2026-11-24
- Deciders: the team

## Context

SYS-OBS is part of the project requirements: logs, metrics and traces must go to
an observability stack. SYS-HEALTH adds liveness/readiness probes. The system has
two runtimes: one NestJS backend instance and a growing number of Rust runners
that consume BullMQ jobs and call the backend's internal API. We need end-to-end
traces, dashboards about the state of each service, and alerts.

## Decision

Use **OpenTelemetry** as the only telemetry protocol and a **self-hosted Grafana
stack**: OpenTelemetry Collector → Tempo (traces), Prometheus (metrics), Loki
(logs), Grafana (datasources, dashboards, alert rules). All backends are
provisioned from files in `observability/`.

The deployment is split into **three independent Compose projects** on one
external Docker network:

1. `deploy/datastores` — Postgres and Redis.
2. `deploy/app` — the backend and N runners.
3. `deploy/observability` — the telemetry backends, deployed **once**, not with
   every app instance.

The app only knows `OTEL_EXPORTER_OTLP_ENDPOINT`; changing it points the same
build at a remote collector without a code change.

Tracing choices:

- Backend: plain OTel Node SDK with auto-instrumentation for HTTP, Express, pg,
  ioredis and Pino. Manual spans cover the Nest provider methods the OTel Nest
  instrumentation cannot see on NestJS 12.
- Queue: `bullmq-otel` provides producer/consumer spans. On top of that, each job
  payload carries a `trace.traceparent` field, which the runner extracts.
- Runner: `tracing` + `tracing-opentelemetry`, OTLP exporters, and a
  `traceparent` header injected into every internal API call. One trace spans
  enqueue → runner job → internal API calls.
- Redaction is recursive and credential-only: `Authorization`, `x-service-token`,
  cookies and any key containing token/secret/password/api-key/credential.

## Alternatives rejected

- **NestJS Observe.** It is first-party and supports OTLP export, but it is a
  hosted service: `appKey`/`appSecret` are required, its collector is
  `observe-api.nestjs.com`, and OTLP export is _in addition to_ sending data to
  Observe, never instead of it. Only spans are exported over OTLP; metrics and
  logs stay in Observe's dashboard, and free-tier export pauses most waterfalls
  after 30,000 events/day. There is no self-hosted collector. It cannot satisfy
  "one Grafana view, nothing external".
- **Jaeger only.** Traces without metrics or logs cannot answer the dashboard
  and health questions.
- **One Compose project for everything.** Grafana would be redeployed with every
  app instance and would share their lifecycle.
- **Per-runner Prometheus scrape endpoints.** Requires service discovery for a
  fleet that scales; pushing OTLP with `service.instance.id` is simpler.

## Consequences

- Positive: one vendor-neutral pipeline; one Grafana view across both runtimes;
  no account, API key or external dependency; dashboards and alerts versioned
  as code; clear per-runner identity.
- Negative: a handful of manual spans must be maintained on the Nest side;
  three Compose projects and an external network to manage; alert notifications
  are in-app only until a contact point is configured.
- `@opentelemetry/instrumentation-nestjs-core` does not support Nest 12, so
  provider-level spans are written by hand. HTTP, DB and Redis spans remain
  automatic.
- The Astro SSR web app is part of the app Compose project (the ADR 0005 note
  about static files on Azure Storage no longer matches the SSR Node adapter).
  Its server process also exports OTLP, and named spans around the auth proxy
  calls join the same traces as the backend.
