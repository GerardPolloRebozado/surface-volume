# runner-rs

Consumes jobs from the `workflow` queue. The job name selects the action:

- `poll` — `{ triggerId, dueAt }`
- `run-step` — `{ stepId, attempt }`

## Run

```bash
REDIS_URL=redis://127.0.0.1:6379 cargo run
```
