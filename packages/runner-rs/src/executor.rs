use anyhow::Result;
use regex::Regex;
use reqwest::{Client, Method, StatusCode};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use tracing::Instrument;

use crate::redaction;

#[derive(Deserialize)]
pub struct PlanCall {
    pub id: String,
    pub method: String,
    pub url: String,
    pub headers: Option<BTreeMap<String, String>>,
    pub body: Option<Value>,
    pub outputs: Option<BTreeMap<String, String>>,
    pub for_each: Option<String>,
    #[serde(rename = "as")]
    pub item_name: Option<String>,
}

#[derive(Deserialize)]
pub struct ActionPlan {
    pub calls: Vec<PlanCall>,
}

pub struct CallError {
    pub kind: &'static str,
    pub message: String,
    pub retry_after_ms: Option<u64>,
}

fn pick(value: &Value, parts: &[&str]) -> Option<Value> {
    if parts.is_empty() {
        return Some(value.clone());
    }

    let part = parts[0];
    if let Some(base) = part.strip_suffix("[*]") {
        let array = value.get(base)?.as_array()?;
        return Some(Value::Array(
            array
                .iter()
                .filter_map(|item| pick(item, &parts[1..]))
                .collect(),
        ));
    }

    if let Some(open) = part.find('[') {
        let base = &part[..open];
        let index: usize = part[open + 1..part.len() - 1].parse().ok()?;
        return pick(value.get(base)?.get(index)?, &parts[1..]);
    }

    pick(value.get(part)?, &parts[1..])
}

pub fn get_path(value: &Value, path: &str) -> Option<Value> {
    let trimmed = path.strip_prefix("$.").unwrap_or(path.strip_prefix('$').unwrap_or(path));
    let parts: Vec<&str> = trimmed.split('.').filter(|part| !part.is_empty()).collect();
    pick(value, &parts)
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = year - if month <= 2 { 1 } else { 0 };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = month + if month > 2 { -3 } else { 9 };
    let doy = (153 * mp + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

fn iso8601_utc_ms(text: &str) -> Option<i64> {
    let year: i64 = text.get(0..4)?.parse().ok()?;
    let month: i64 = text.get(5..7)?.parse().ok()?;
    let day: i64 = text.get(8..10)?.parse().ok()?;
    let hour: i64 = text.get(11..13)?.parse().ok()?;
    let minute: i64 = text.get(14..16)?.parse().ok()?;
    let second: i64 = text.get(17..19)?.parse().ok()?;
    let millis: i64 = if text.as_bytes().get(19) == Some(&b'.') {
        let end = text[20..].find(|c: char| !c.is_ascii_digit()).map(|i| 20 + i).unwrap_or(text.len());
        let raw = &text[20..end];
        let padded = format!("{:0<3}", raw);
        padded.get(0..3)?.parse().ok()?
    } else {
        0
    };
    let seconds = days_from_civil(year, month, day) * 86400 + hour * 3600 + minute * 60 + second;
    Some(seconds * 1000 + millis)
}

fn as_text(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

fn resolve_string(text: &str, values: &Value) -> String {
    let pattern = Regex::new(r"\{\{\s*([\w.\[\]*]+)\s*\}\}").unwrap();
    pattern
        .replace_all(text, |caps: &regex::Captures| {
            get_path(values, &caps[1])
                .map(|value| as_text(&value))
                .unwrap_or_default()
        })
        .to_string()
}

fn resolve_value(value: &Value, values: &Value) -> Value {
    match value {
        Value::String(text) => Value::String(resolve_string(text, values)),
        Value::Array(items) => {
            Value::Array(items.iter().map(|item| resolve_value(item, values)).collect())
        }
        Value::Object(map) => {
            let mut out = map.clone();
            for (_, nested) in out.iter_mut() {
                *nested = resolve_value(nested, values);
            }
            Value::Object(out)
        }
        other => other.clone(),
    }
}

async fn execute_one(
    http: &Client,
    call: &PlanCall,
    values: &Value,
) -> Result<(Value, Option<CallError>)> {
    let url = resolve_string(&call.url, values);
    let target = reqwest::Url::parse(&url)
        .map(|parsed| {
            format!(
                "{}://{}{}",
                parsed.scheme(),
                parsed.host_str().unwrap_or("unknown"),
                parsed.path()
            )
        })
        .unwrap_or_else(|_| "<invalid-url>".to_string());

    let span = tracing::info_span!(
        "runner.action_call",
        "call.id" = %call.id,
        "http.request.method" = %call.method,
        "http.target" = %target,
        "error.kind" = tracing::field::Empty,
    );

    async move {
        if let Some(headers) = &call.headers {
            tracing::debug!(headers = %redaction::redact_headers(headers), "action headers");
        }
        if let Some(body) = &call.body {
            tracing::debug!(body = %redaction::redact_body(body), "action body");
        }

        let result = execute_one_inner(http, call, values, &url).await;
        if let Ok((_, Some(error))) = &result {
            tracing::Span::current().record("error.kind", error.kind);
        }
        result
    }
    .instrument(span)
    .await
}

async fn execute_one_inner(
    http: &Client,
    call: &PlanCall,
    values: &Value,
    url: &str,
) -> Result<(Value, Option<CallError>)> {
    let mut request = http.request(Method::from_bytes(call.method.as_bytes())?, url);

    if let Some(headers) = &call.headers {
        for (name, value) in headers {
            request = request.header(name, resolve_string(value, values));
        }
    }
    if let Some(body) = &call.body {
        request = request.json(&resolve_value(body, values));
    }

    let response = request.send().await?;
    let status = response.status();
    let retry_after_ms = response
        .headers()
        .get("retry-after")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .map(|seconds| seconds * 1000)
        .or_else(|| {
            let reset = response
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|value| value.to_str().ok())
                .and_then(iso8601_utc_ms)?;
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .ok()?
                .as_millis() as i64;
            let remaining = reset.checked_sub(now)?;
            if remaining <= 0 { None } else { Some(remaining as u64) }
        });
    let text = response.text().await?;
    let parsed: Value = serde_json::from_str(&text).unwrap_or(Value::Null);

    if !status.is_success() {
        let kind = match status {
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => "auth_expired",
            StatusCode::TOO_MANY_REQUESTS => "rate_limited",
            status if status.is_server_error() => "retryable",
            _ => "fatal",
        };
        return Ok((
            parsed,
            Some(CallError {
                kind,
                message: format!("{} returned {}", call.id, status),
                retry_after_ms: if kind == "rate_limited" { retry_after_ms } else { None },
            }),
        ));
    }

    Ok((parsed, None))
}

pub async fn execute_plan(http: &Client, plan: ActionPlan) -> Result<(Value, Option<CallError>)> {
    let mut values = json!({});

    for call in plan.calls {
        let items: Vec<Option<Value>> = match call.for_each.as_deref().and_then(|path| get_path(&values, path)) {
            Some(Value::Array(array)) => array.into_iter().map(Some).collect(),
            Some(other) => vec![Some(other)],
            None => vec![None],
        };

        let mut collected: BTreeMap<String, Vec<Value>> = BTreeMap::new();
        let mut responses = Vec::new();

        for item in items {
            if let Some(value) = item {
                values[call.item_name.as_deref().unwrap_or("item")] = value;
            }

            let (parsed, error) = execute_one(http, &call, &values).await?;
            if let Some(error) = error {
                return Ok((values, Some(error)));
            }

            if let Some(outputs) = &call.outputs {
                for (name, path) in outputs {
                    if let Some(value) = get_path(&parsed, path) {
                        collected.entry(name.clone()).or_default().push(value);
                    }
                }
            }
            responses.push(parsed);
        }

        if call.for_each.is_some() {
            for (name, list) in collected {
                values[name] = Value::Array(list);
            }
            values[&call.id] = Value::Array(responses);
        } else {
            if let Some(parsed) = responses.first() {
                if let Some(outputs) = &call.outputs {
                    for (name, path) in outputs {
                        if let Some(value) = get_path(parsed, path) {
                            values[name] = value;
                        }
                    }
                }
                values[&call.id] = parsed.clone();
            }
        }
    }

    Ok((values, None))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_simple_and_wildcard_paths() {
        let value = json!({ "id": "abc", "items": [{ "id": "1" }, { "id": "2" }] });
        assert_eq!(get_path(&value, "$.id"), Some(json!("abc")));
        assert_eq!(get_path(&value, "$.items[*].id"), Some(json!(["1", "2"])));
    }

    #[test]
    fn parses_mastodon_reset_header() {
        assert_eq!(iso8601_utc_ms("2026-11-24T10:00:00Z"), Some(1795514400000));
        assert_eq!(iso8601_utc_ms("2026-11-24T10:00:00.500Z"), Some(1795514400500));
        assert_eq!(iso8601_utc_ms("not-a-date"), None);
    }

    #[test]
    fn resolves_templates_from_earlier_calls() {
        let values = json!({ "ids": ["1", "2"] });
        assert_eq!(resolve_string("id={{ ids[0] }}", &values), "id=1");
        assert_eq!(resolve_string("{{ ids }}", &values), "[\"1\",\"2\"]");
    }
}
