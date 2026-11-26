use serde_json::{json, Value};
use std::collections::BTreeMap;

const REDACTED: &str = "[REDACTED]";
const MAX_LENGTH: usize = 4096;

const SENSITIVE_KEYS: &[&str] = &[
    "authorization",
    "proxy-authorization",
    "x-service-token",
    "cookie",
    "set-cookie",
    "token",
    "secret",
    "password",
    "passwd",
    "apikey",
    "api_key",
    "api-key",
    "credential",
    "private_key",
];

fn is_sensitive(key: &str) -> bool {
    let normalized = key.to_ascii_lowercase().replace('-', "_");
    SENSITIVE_KEYS
        .iter()
        .any(|sensitive| normalized.contains(sensitive.replace('-', "_").as_str()))
}

fn clip(text: &str) -> String {
    if text.chars().count() > MAX_LENGTH {
        format!("{}…[truncated]", text.chars().take(MAX_LENGTH).collect::<String>())
    } else {
        text.to_string()
    }
}

/// Masks credential-shaped keys anywhere in a JSON value.
pub fn redact(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut out = serde_json::Map::new();
            for (key, item) in map {
                out.insert(
                    key.clone(),
                    if is_sensitive(key) {
                        Value::String(REDACTED.to_string())
                    } else {
                        redact(item)
                    },
                );
            }
            Value::Object(out)
        }
        Value::Array(items) => Value::Array(items.iter().map(redact).collect()),
        Value::String(text) => Value::String(clip(text)),
        other => other.clone(),
    }
}

pub fn redact_headers(headers: &BTreeMap<String, String>) -> Value {
    redact(&json!(headers))
}

pub fn redact_body(body: &Value) -> String {
    redact(body).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_nested_credentials() {
        let input = json!({
            "Authorization": "Bearer secret",
            "nested": { "apiKey": "abc", "keep": "visible" },
            "items": [{ "password": "hunter2" }]
        });
        let result = redact(&input);
        assert_eq!(result["Authorization"], REDACTED);
        assert_eq!(result["nested"]["apiKey"], REDACTED);
        assert_eq!(result["nested"]["keep"], "visible");
        assert_eq!(result["items"][0]["password"], REDACTED);
    }

    #[test]
    fn caps_large_strings() {
        let result = redact_body(&json!({ "note": "x".repeat(10_000) }));
        assert!(result.len() < 5000);
        assert!(result.contains("[truncated]"));
    }
}
