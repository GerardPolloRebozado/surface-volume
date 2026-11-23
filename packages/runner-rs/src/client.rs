use anyhow::{anyhow, Result};
use reqwest::StatusCode;
use serde_json::{json, Value};
use std::env;
use std::time::Duration;

pub struct InternalApi {
    http: reqwest::Client,
    base_url: String,
    token: String,
}

impl InternalApi {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(120))
                .build()?,
            base_url: env::var("API_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:8080".into()),
            token: env::var("INTERNAL_SERVICE_TOKEN")
                .map_err(|_| anyhow!("INTERNAL_SERVICE_TOKEN is not set"))?,
        })
    }

    pub async fn run_step(&self, step_id: &str, attempt: u64) -> Result<Value> {
        let response = self
            .http
            .post(format!("{}/internal/steps/{}/run", self.base_url, step_id))
            .header("x-service-token", &self.token)
            .json(&json!({ "attempt": attempt }))
            .send()
            .await?;

        let status = response.status();
        let body: Value = response.json().await.unwrap_or(Value::Null);

        if status == StatusCode::CONFLICT {
            return Ok(body);
        }
        if !status.is_success() {
            return Err(anyhow!("internal api returned {}: {}", status, body));
        }

        Ok(body)
    }

    pub async fn poll_trigger(&self, trigger_id: &str, due_at: &str) -> Result<Value> {
        let response = self
            .http
            .post(format!(
                "{}/internal/triggers/{}/poll",
                self.base_url, trigger_id
            ))
            .header("x-service-token", &self.token)
            .json(&json!({ "dueAt": due_at }))
            .send()
            .await?;

        let status = response.status();
        let body: Value = response.json().await.unwrap_or(Value::Null);

        if status == StatusCode::CONFLICT {
            return Ok(body);
        }
        if !status.is_success() {
            return Err(anyhow!("internal api returned {}: {}", status, body));
        }

        Ok(body)
    }
}
