mod client;
mod executor;

use bullmq::options::{RedisConnectionOptions, WorkerOptions};
use bullmq::{Error as BullmqError, Job, Worker};
use client::InternalApi;
use executor::ActionPlan;
use serde_json::{json, Value};
use std::env;
use std::sync::Arc;

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

async fn work() -> anyhow::Result<()> {
    let api = Arc::new(InternalApi::from_env()?);

    let mut opts = WorkerOptions::default();
    opts.connection = redis_options();
    opts.concurrency = 4;

    let worker = Worker::with_options(
        "workflow",
        move |job: Job, _token| {
            let api = api.clone();
            Box::pin(async move {
                match job.name() {
                    "run-step" => {
                        let data = job.data();
                        let step_id = data["stepId"].as_str().ok_or_else(|| {
                            BullmqError::InvalidConfig("missing stepId".into())
                        })?;
                        let attempt = data["attempt"].as_u64().unwrap_or(1);
                        let result = run_step(&api, step_id, attempt)
                            .await
                            .map_err(to_worker_error)?;
                        Ok(result)
                    }
                    "poll" => {
                        let data = job.data();
                        let trigger_id = data["triggerId"].as_str().ok_or_else(|| {
                            BullmqError::InvalidConfig("missing triggerId".into())
                        })?;
                        let due_at = data["dueAt"].as_str().unwrap_or("");
                        let result = api
                            .poll_trigger(trigger_id, due_at)
                            .await
                            .map_err(to_worker_error)?;
                        Ok(result)
                    }
                    other => Ok(json!({ "skipped": other })),
                }
            })
        },
        opts,
    )
    .await?;

    println!("runner listening on workflow (Ctrl-C to stop)");
    tokio::signal::ctrl_c().await?;
    worker.close(5_000).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    work().await
}
