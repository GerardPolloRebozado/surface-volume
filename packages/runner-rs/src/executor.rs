use anyhow::Result;
use regex::Regex;
use reqwest::{Client, Method, StatusCode};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;

#[derive(Deserialize)]
pub struct PlanCall {
    pub id: String,
    pub method: String,
    pub url: String,
    pub headers: Option<BTreeMap<String, String>>,
    pub body: Option<Value>,
    pub outputs: Option<BTreeMap<String, String>>,
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
            let path = &caps[1];
            get_path(values, path).map(|value| as_text(&value)).unwrap_or_default()
        })
        .to_string()
}

fn resolve_value(value: &Value, values: &Value) -> Value {
    match value {
        Value::String(text) => Value::String(resolve_string(text, values)),
        Value::Array(items) => Value::Array(items.iter().map(|item| resolve_value(item, values)).collect()),
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

pub async fn execute_plan(http: &Client, plan: ActionPlan) -> Result<(Value, Option<CallError>)> {
    let mut values = json!({});

    for call in plan.calls {
        let url = resolve_string(&call.url, &values);
        let method = Method::from_bytes(call.method.as_bytes())?;
        let mut request = http.request(method, &url);

        if let Some(headers) = &call.headers {
            for (name, value) in headers {
                request = request.header(name, resolve_string(value, &values));
            }
        }
        if let Some(body) = &call.body {
            request = request.json(&resolve_value(body, &values));
        }

        let response = request.send().await?;
        let status = response.status();
        let retry_after_ms = response
            .headers()
            .get("retry-after")
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.parse::<u64>().ok())
            .map(|seconds| seconds * 1000);
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
                values,
                Some(CallError {
                    kind,
                    message: format!("{} returned {}", call.id, status),
                    retry_after_ms: if kind == "rate_limited" { retry_after_ms } else { None },
                }),
            ));
        }

        if let Some(outputs) = &call.outputs {
            for (name, path) in outputs {
                if let Some(value) = get_path(&parsed, path) {
                    values[name] = value;
                }
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
        assert_eq!(
            get_path(&value, "$.items[*].id"),
            Some(json!(["1", "2"]))
        );
    }

    #[test]
    fn resolves_templates_from_earlier_calls() {
        let values = json!({ "ids": ["1", "2"] });
        assert_eq!(resolve_string("id={{ ids[0] }}", &values), "id=1");
        assert_eq!(resolve_string("{{ ids }}", &values), "[\"1\",\"2\"]");
    }
}
