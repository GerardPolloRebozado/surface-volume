# ADR 0010 — Step queue and external runner

- Status: **Accepted**
- Date: 2026-11-23
- Deciders: @alejandrolaguna20 @gerardPolloRebozado

## Context

Workflows have long delays, polling triggers and per-node retries. One queue job per
run makes all three awkward: a run holds a worker for minutes, a delayed node blocks
the rest of the graph, and a poll cannot reschedule itself without a second mechanism.
The runner must also be a separate process from the API, and Postgres must stay the
source of truth.

## Decision

- One BullMQ queue named `workflow`. Two job names: `poll` and `run-step`.
- One job = **one step**, not one run. The payload is `{ stepId, attempt }` or
  `{ triggerId, dueAt }` — never the graph, never a secret.
- NestJS is the **planner**: on a step result it writes `RunStep` rows and enqueues
  continuations. The graph (`links`, `branch`, `filter`, `delay`, `loop`, `onError`)
  is evaluated in one place, in TypeScript.
- The Rust worker only consumes jobs and makes one HTTP call per job to
  `/internal/steps/:id/run` or `/internal/triggers/:id/poll`.
- Postgres first, Redis second: a step's result and its successor rows are committed
  before the jobs are enqueued. A sweeper repairs lost enqueues and stale leases.
- A poll writes its next `next_run_at` to Postgres, then enqueues itself with a delay.
  The sweeper only repairs; it is not a second scheduler.
- Job ids are `step:<stepId>:<attempt>` and `poll:<triggerId>:<dueAt>`, giving
  deduplication and a distinct job for each retry.
- Delivery is **at-least-once**. Provider-level idempotency keys are out of scope.

## Alternatives rejected

- **One job per run.** A delay or a polling interval keeps a worker busy, and a
  retry restarts the whole graph.
- **Worker-side planning.** The worker would need `links`, `fromPath`, condition
  evaluation, `{{ }}` substitution and loop indexing in Rust — a second
  implementation of the same semantics, guaranteed to drift.
- **Two queues (`triggers` + `steps`).** Cleaner rate limiting, but two
  registrations and two worker loops for no benefit at this scale. Priority 1 for
  polls and priority 5 for steps, plus worker concurrency 4, prevent starvation.
  Split only if a late poll is measured or a provider needs a per-kind limiter.
- **Node worker instead of Rust.** The contract is HTTP + Redis, so it remains a
  drop-in replacement; the separate process is kept for isolation and independent
  scaling of the queue consumer.

## Consequences

### Positive

- Delays, polls and per-step retries are plain BullMQ features.
- No secrets in Redis, no graph in the worker, no chatty internal protocol.
- A lost Redis job cannot lose a run: the `RunStep` row already exists.
- The executor process can be restarted or replaced without touching the API.

### Negative

- One HTTP hop per step, and the internal request stays open for the action duration.
- The rate limiter is per worker, not per job kind.
- At-least-once delivery means a connector can repeat a side effect if the process
  dies after the provider call but before the result is committed.
