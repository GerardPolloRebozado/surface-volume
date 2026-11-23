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

    pub fn http(&self) -> &reqwest::Client {
        &self.http
    }

    async fn post(&self, path: String, body: Value) -> Result<(StatusCode, Value)> {
        let response = self
            .http
            .post(format!("{}{}", self.base_url, path))
            .header("x-service-token", &self.token)
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        let body: Value = response.json().await.unwrap_or(Value::Null);

        if status == StatusCode::CONFLICT {
            return Ok((status, body));
        }
        if !status.is_success() {
            return Err(anyhow!("internal api returned {}: {}", status, body));
        }

        Ok((status, body))
    }

    pub async fn claim_step(&self, step_id: &str, attempt: u64) -> Result<Value> {
        let (_, body) = self
            .post(
                format!("/internal/steps/{}/claim", step_id),
                json!({ "attempt": attempt }),
            )
            .await?;
        Ok(body)
    }

    pub async fn report_step(&self, step_id: &str, attempt: u64, outcome: Value) -> Result<Value> {
        let mut body = outcome;
        body["attempt"] = json!(attempt);
        let (_, result) = self
            .post(format!("/internal/steps/{}/result", step_id), body)
            .await?;
        Ok(result)
    }

    pub async fn poll_trigger(&self, trigger_id: &str, due_at: &str) -> Result<Value> {
        let (_, body) = self
            .post(
                format!("/internal/triggers/{}/poll", trigger_id),
                json!({ "dueAt": due_at }),
            )
            .await?;
        Ok(body)
    }
}
