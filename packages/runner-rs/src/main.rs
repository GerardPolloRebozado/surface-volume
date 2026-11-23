// NestJS gets POST /workflows/:id/runs, writes to the postgres
// Nest puts { runId } into Redis queue "runs"
// We run the stuff here, however it works

use bullmq::options::{RedisConnectionOptions, WorkerOptions};
use bullmq::{Job, Worker};
use serde_json::json;
use std::env;

fn redis_options() -> RedisConnectionOptions {
    let mut opts = RedisConnectionOptions::default();
    opts.url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    opts
}

// we need the .await to run this
async fn work() -> anyhow::Result<()> {
    let mut opts = WorkerOptions::default();
    opts.connection = redis_options();
    opts.concurrency = 2;

    let worker = Worker::with_options(
        "runs",
        // Box::pin is Rust stuff this crate needs:
        //   Box  -> fixed-size pointer, so any async block can be stored
        //   Pin  -> don't move it around while it is running
        // async move = the block owns `job`, it doesn't borrow it
        |job: Job, _token| {
            // _token is BullMQ's "stop now" signal, so we will do:
            // if token.is_cancelled() { return Ok(json!({...})) }
            Box::pin(async move {
                println!(
                    "processing job {} ({}) data={}",
                    job.id(),
                    job.name(),
                    job.data()
                );

                // real runner goes here
                Ok(json!({ "ok": true }))
            })
        },
        opts,
    )
    .await?;

    println!("runner listening on queue 'runs' (Ctrl-C to stop)");
    tokio::signal::ctrl_c().await?;

    worker.close(5_000).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    work().await
}
