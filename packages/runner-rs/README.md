# runner-rs

Consumes jobs from the `workflow` queue. The job name selects the action:

- `poll` — `{ triggerId, dueAt }`
- `run-step` — `{ stepId, attempt }`

## Run

```bash
REDIS_URL=redis://127.0.0.1:6379 \
INTERNAL_SERVICE_TOKEN=change-me \
cargo run -- work
```

## Telemetry

The runner exports OpenTelemetry traces, metrics and logs over OTLP/HTTP.
In the Compose stack these variables are set for you; when running locally they
are optional (the exporter simply fails to reach a collector if unset):

| Variable | Default | Purpose |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Collector base URL; `/v1/traces`, `/v1/metrics` and `/v1/logs` are appended |
| `OTEL_SERVICE_NAME` | `runner` | OTel service name |
| `RUNNER_ID` | `HOSTNAME` | `service.instance.id` — must be unique per runner |
| `RUST_LOG` | `info` | tracing filter |
| `REDIS_URL` | `redis://127.0.0.1:6379` | BullMQ connection |
| `API_BASE_URL` | `http://localhost:8080` | Backend internal API |
| `INTERNAL_SERVICE_TOKEN` | required | `x-service-token` header |

Each job carries a `trace.traceparent` field in its payload; the runner uses it
as the parent of the job span and injects a fresh `traceparent` into every
internal API call, so one trace spans the whole workflow step.
