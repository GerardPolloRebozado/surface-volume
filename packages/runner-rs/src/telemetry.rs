use anyhow::Result;
use opentelemetry::global;
use opentelemetry::metrics::{Counter, Gauge, Histogram, Meter, UpDownCounter};
use opentelemetry::propagation::{Extractor, Injector};
use opentelemetry::{Context, KeyValue};
use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
use opentelemetry_otlp::{LogExporter, MetricExporter, SpanExporter, WithExportConfig};
use opentelemetry_sdk::logs::SdkLoggerProvider;
use opentelemetry_sdk::metrics::SdkMeterProvider;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use opentelemetry_sdk::trace::SdkTracerProvider;
use opentelemetry_sdk::Resource;
use std::collections::HashMap;
use std::env;
use std::sync::OnceLock;
use tracing_opentelemetry::{OpenTelemetryLayer, OpenTelemetrySpanExt};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

/// Providers are kept alive for the whole process so final batches are flushed.
pub struct Telemetry {
    tracer: SdkTracerProvider,
    meter: SdkMeterProvider,
    logger: SdkLoggerProvider,
}

impl Telemetry {
    pub fn shutdown(&self) {
        let _ = self.tracer.shutdown();
        let _ = self.meter.shutdown();
        let _ = self.logger.shutdown();
    }
}

pub struct RunnerMetrics {
    pub jobs_active: UpDownCounter<i64>,
    pub jobs_total: Counter<u64>,
    pub job_duration: Histogram<f64>,
    pub api_calls: Counter<u64>,
    pub heartbeat: Gauge<i64>,
}

static METRICS: OnceLock<RunnerMetrics> = OnceLock::new();

pub fn metrics() -> &'static RunnerMetrics {
    METRICS.get().expect("telemetry is not initialised")
}

fn signal_endpoint(base: &str, signal: &str) -> String {
    let base = base.trim_end_matches('/');
    if base.ends_with(signal) {
        base.to_string()
    } else {
        format!("{base}{signal}")
    }
}

pub fn instance_id() -> String {
    env::var("RUNNER_ID")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unknown".to_string())
}

pub fn init() -> Result<Telemetry> {
    let base = env::var("OTEL_EXPORTER_OTLP_ENDPOINT")
        .unwrap_or_else(|_| "http://localhost:4318".to_string());

    let resource = Resource::builder()
        .with_service_name(env::var("OTEL_SERVICE_NAME").unwrap_or_else(|_| "runner".into()))
        .with_attributes(vec![
            KeyValue::new("service.instance.id", instance_id()),
            KeyValue::new("deployment.environment", "production"),
        ])
        .build();

    let tracer = SdkTracerProvider::builder()
        .with_resource(resource.clone())
        .with_batch_exporter(
            SpanExporter::builder()
                .with_http()
                .with_endpoint(signal_endpoint(&base, "/v1/traces"))
                .build()?,
        )
        .build();
    global::set_tracer_provider(tracer.clone());

    let meter = SdkMeterProvider::builder()
        .with_resource(resource.clone())
        .with_periodic_exporter(
            MetricExporter::builder()
                .with_http()
                .with_endpoint(signal_endpoint(&base, "/v1/metrics"))
                .build()?,
        )
        .build();
    global::set_meter_provider(meter.clone());

    let logger = SdkLoggerProvider::builder()
        .with_resource(resource)
        .with_batch_exporter(
            LogExporter::builder()
                .with_http()
                .with_endpoint(signal_endpoint(&base, "/v1/logs"))
                .build()?,
        )
        .build();

    global::set_text_map_propagator(TraceContextPropagator::new());

    let meter_handle: Meter = global::meter("surface-volume-runner");
    let _ = METRICS.set(RunnerMetrics {
        jobs_active: meter_handle.i64_up_down_counter("runner.jobs.active").build(),
        jobs_total: meter_handle.u64_counter("runner.jobs.total").build(),
        job_duration: meter_handle.f64_histogram("runner.job.duration").build(),
        api_calls: meter_handle.u64_counter("runner.api.calls").build(),
        heartbeat: meter_handle.i64_gauge("runner.heartbeat").build(),
    });

    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with(tracing_subscriber::fmt::layer().json())
        .with(OpenTelemetryLayer::new(global::tracer("surface-volume-runner")))
        .with(OpenTelemetryTracingBridge::new(&logger))
        .init();

    Ok(Telemetry { tracer, meter, logger })
}

struct Carrier(HashMap<String, String>);

impl Extractor for Carrier {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(&key.to_ascii_lowercase()).map(String::as_str)
    }

    fn keys(&self) -> Vec<&str> {
        self.0.keys().map(String::as_str).collect()
    }
}

#[derive(Default)]
struct HeaderInjector(HashMap<String, String>);

impl Injector for HeaderInjector {
    fn set(&mut self, key: &str, value: String) {
        self.0.insert(key.to_ascii_lowercase(), value);
    }
}

/// Builds an OTel context from the `traceparent` stored in a BullMQ job payload.
pub fn parent_context(traceparent: Option<&str>) -> Context {
    match traceparent {
        Some(value) => {
            let mut map = HashMap::new();
            map.insert("traceparent".to_string(), value.to_string());
            global::get_text_map_propagator(|propagator| {
                propagator.extract_with_context(&Context::current(), &Carrier(map.clone()))
            })
        }
        None => Context::current(),
    }
}

/// Returns the W3C traceparent for the current tracing span, to attach to HTTP calls.
pub fn current_traceparent() -> Option<String> {
    let cx = tracing::Span::current().context();
    global::get_text_map_propagator(|propagator| {
        let mut injector = HeaderInjector::default();
        propagator.inject_context(&cx, &mut injector);
        injector.0.get("traceparent").cloned()
    })
}
