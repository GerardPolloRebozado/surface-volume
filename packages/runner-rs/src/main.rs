mod client;
mod executor;
mod redaction;
mod telemetry;

use bullmq::options::{RedisConnectionOptions, WorkerOptions};
use bullmq::{Error as BullmqError, Job, Worker};
use client::InternalApi;
use executor::ActionPlan;
use opentelemetry::KeyValue;
use serde_json::{json, Value};
use std::env;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::Instrument;
use tracing_opentelemetry::OpenTelemetrySpanExt;

fn redis_options() -> RedisConnectionOptions {
    let mut opts = RedisConnectionOptions::default();
    opts.url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    opts
}

fn to_worker_error(error: anyhow::Error) -> BullmqError {
    BullmqError::InvalidConfig(error.to_string())
}

async fn run_step(api: &InternalApi, step_id: &str, attempt: u64) -> anyhow::Result<Value> {
    let claim = api.claim_step(step_id, attempt).await?;
    if claim.get("reason").is_some() || claim.get("plan").is_none() {
        return Ok(claim);
    }

    let plan: ActionPlan = serde_json::from_value(claim["plan"].clone())?;
    let (outputs, error) = executor::execute_plan(api.http(), plan).await?;

    let outcome = match error {
        None => json!({ "status": "succeeded", "outputs": outputs }),
        Some(error) => json!({
            "status": "failed",
            "outputs": outputs,
            "errorKind": error.kind,
            "errorMessage": error.message,
            "retryAfterMs": error.retry_after_ms,
        }),
    };

    api.report_step(step_id, attempt, outcome).await
}

async fn run_poll(api: &InternalApi, trigger_id: &str, due_at: &str) -> anyhow::Result<Value> {
    let claim = api.claim_poll(trigger_id, due_at).await?;
    if claim.get("reason").is_some() || claim.get("plan").is_none() {
        return Ok(claim);
    }

    let plan: ActionPlan = serde_json::from_value(claim["plan"].clone())?;
    let (outputs, error) = executor::execute_plan(api.http(), plan).await?;

    let mut body = match error {
        None => json!({ "status": "succeeded", "outputs": outputs }),
        Some(error) => json!({
            "status": "failed",
            "outputs": outputs,
            "errorKind": error.kind,
            "errorMessage": error.message,
            "retryAfterMs": error.retry_after_ms,
        }),
    };
    body["dueAt"] = json!(due_at);

    api.submit_poll(trigger_id, body).await
}

async fn process_job(job: Job, api: Arc<InternalApi>) -> Result<Value, BullmqError> {
    let name = job.name().to_string();
    let traceparent = job
        .data()
        .get("trace")
        .and_then(|trace| trace.get("traceparent"))
        .and_then(Value::as_str);

    let span = tracing::info_span!(
        "runner.job",
        "job.name" = %name,
        "bullmq.job.id" = %job.id(),
        "service.instance.id" = %telemetry::instance_id(),
        "step.id" = tracing::field::Empty,
        "trigger.id" = tracing::field::Empty,
        "otel.status_code" = tracing::field::Empty,
    );
    let _ = span.set_parent(telemetry::parent_context(traceparent));

    async move {
        let started = Instant::now();
        let metrics = telemetry::metrics();
        metrics.jobs_active.add(1, &[]);

        let result = match name.as_str() {
            "run-step" => {
                let data = job.data();
                let step_id = data["stepId"].as_str().ok_or_else(|| {
                    BullmqError::InvalidConfig("missing stepId".into())
                })?;
                let attempt = data["attempt"].as_u64().unwrap_or(1);
                tracing::Span::current().record("step.id", step_id);
                let outcome = run_step(&api, step_id, attempt)
                    .await
                    .map_err(to_worker_error)?;
                Ok(outcome)
            }
            "poll" => {
                let data = job.data();
                let trigger_id = data["triggerId"].as_str().ok_or_else(|| {
                    BullmqError::InvalidConfig("missing triggerId".into())
                })?;
                let due_at = data["dueAt"].as_str().unwrap_or("");
                tracing::Span::current().record("trigger.id", trigger_id);
                let outcome = run_poll(&api, trigger_id, due_at)
                    .await
                    .map_err(to_worker_error)?;
                Ok(outcome)
            }
            other => Ok(json!({ "skipped": other })),
        };

        if result.is_err() {
            tracing::Span::current().record("otel.status_code", "ERROR");
        }
        metrics.jobs_active.add(-1, &[]);
        metrics.jobs_total.add(
            1,
            &[
                KeyValue::new("outcome", if result.is_ok() { "succeeded" } else { "failed" }),
                KeyValue::new("job_name", name.clone()),
            ],
        );
        metrics.job_duration.record(
            started.elapsed().as_secs_f64(),
            &[KeyValue::new("job_name", name)],
        );
        result
    }
    .instrument(span)
    .await
}

async fn work() -> anyhow::Result<()> {
    let _telemetry = telemetry::init()?;
    let api = Arc::new(InternalApi::from_env()?);

    let heartbeat = tokio::spawn(async {
        loop {
            telemetry::metrics().heartbeat.record(1, &[]);
            tokio::time::sleep(Duration::from_secs(15)).await;
        }
    });

    let mut opts = WorkerOptions::default();
    opts.connection = redis_options();
    opts.concurrency = 4;

    let worker = Worker::with_options(
        "workflow",
        move |job: Job, _token| {
            let api = api.clone();
            Box::pin(async move { process_job(job, api).await })
        },
        opts,
    )
    .await?;

    tracing::info!("runner listening on workflow (Ctrl-C to stop)");
    tokio::signal::ctrl_c().await?;
    heartbeat.abort();
    worker.close(5_000).await?;
    _telemetry.shutdown();
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    work().await
}
