mod client;

use bullmq::options::{RedisConnectionOptions, WorkerOptions};
use bullmq::{Error as BullmqError, Job, Worker};
use client::InternalApi;
use serde_json::json;
use std::env;
use std::sync::Arc;

fn redis_options() -> RedisConnectionOptions {
    let mut opts = RedisConnectionOptions::default();
    opts.url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    opts
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
                        let result = api
                            .run_step(step_id, attempt)
                            .await
                            .map_err(|error| BullmqError::InvalidConfig(error.to_string()))?;
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
                            .map_err(|error| BullmqError::InvalidConfig(error.to_string()))?;
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
