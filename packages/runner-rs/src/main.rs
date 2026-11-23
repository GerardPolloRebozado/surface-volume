use bullmq::options::{RedisConnectionOptions, WorkerOptions};
use bullmq::{Job, Worker};
use serde_json::json;
use std::env;

fn redis_options() -> RedisConnectionOptions {
    let mut opts = RedisConnectionOptions::default();
    opts.url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    opts
}

async fn work() -> anyhow::Result<()> {
    let mut opts = WorkerOptions::default();
    opts.connection = redis_options();
    opts.concurrency = 4;

    let worker = Worker::with_options(
        "workflow",
        |job: Job, _token| {
            Box::pin(async move {
                let data = job.data();
                let trigger_id = data["triggerId"].as_str().unwrap_or("unknown");
                println!("{} {} {}", job.id(), job.name(), trigger_id);
                Ok(json!({ "ok": true }))
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
