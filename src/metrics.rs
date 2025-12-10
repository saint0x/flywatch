use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use sysinfo::System;
use tokio::sync::RwLock;

#[derive(Debug, Default)]
pub struct Metrics {
    // Connection state
    nats_connected: AtomicBool,

    // Counters
    subscription_errors: AtomicU64,
    messages_forwarded: AtomicU64,
    sse_connections_total: AtomicU64,
    ws_connections_total: AtomicU64,

    // Gauges (current values)
    active_sse_connections: AtomicU64,
    active_ws_connections: AtomicU64,

    // System info (updated periodically)
    system: RwLock<Option<SystemMetrics>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemMetrics {
    pub cpu_usage_percent: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub memory_usage_percent: f32,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MetricsSnapshot {
    // Timestamps
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub uptime_seconds: u64,

    // NATS
    pub nats_connected: bool,
    pub subscription_errors: u64,
    pub messages_forwarded: u64,

    // Connections
    pub sse_connections_total: u64,
    pub ws_connections_total: u64,
    pub active_sse_connections: u64,
    pub active_ws_connections: u64,

    // System
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<SystemMetrics>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HealthStatus {
    pub status: &'static str,
    pub nats_connected: bool,
    pub active_connections: u64,
    pub messages_forwarded: u64,
    pub uptime_seconds: u64,
}

impl Metrics {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    // NATS connection state
    pub fn set_nats_connected(&self, connected: bool) {
        self.nats_connected.store(connected, Ordering::SeqCst);
    }

    pub fn is_nats_connected(&self) -> bool {
        self.nats_connected.load(Ordering::SeqCst)
    }

    // Error counters
    pub fn increment_subscription_errors(&self) {
        self.subscription_errors.fetch_add(1, Ordering::SeqCst);
    }

    pub fn increment_messages_forwarded(&self) {
        self.messages_forwarded.fetch_add(1, Ordering::SeqCst);
    }

    // SSE connection tracking
    pub fn increment_sse_connections(&self) {
        self.sse_connections_total.fetch_add(1, Ordering::SeqCst);
        self.active_sse_connections.fetch_add(1, Ordering::SeqCst);
    }

    pub fn decrement_active_sse_connections(&self) {
        self.active_sse_connections.fetch_sub(1, Ordering::SeqCst);
    }

    // WebSocket connection tracking
    pub fn increment_ws_connections(&self) {
        self.ws_connections_total.fetch_add(1, Ordering::SeqCst);
        self.active_ws_connections.fetch_add(1, Ordering::SeqCst);
    }

    pub fn decrement_active_ws_connections(&self) {
        self.active_ws_connections.fetch_sub(1, Ordering::SeqCst);
    }

    // System metrics update
    pub async fn update_system_metrics(&self) {
        let mut sys = System::new_all();
        sys.refresh_all();

        let cpu_usage = sys.global_cpu_usage();
        let memory_used = sys.used_memory();
        let memory_total = sys.total_memory();
        let memory_percent = if memory_total > 0 {
            (memory_used as f32 / memory_total as f32) * 100.0
        } else {
            0.0
        };

        let metrics = SystemMetrics {
            cpu_usage_percent: cpu_usage,
            memory_used_bytes: memory_used,
            memory_total_bytes: memory_total,
            memory_usage_percent: memory_percent,
            uptime_seconds: System::uptime(),
        };

        *self.system.write().await = Some(metrics);
    }

    // Get current snapshot
    pub async fn snapshot(&self, start_time: std::time::Instant) -> MetricsSnapshot {
        MetricsSnapshot {
            timestamp: chrono::Utc::now(),
            uptime_seconds: start_time.elapsed().as_secs(),
            nats_connected: self.nats_connected.load(Ordering::SeqCst),
            subscription_errors: self.subscription_errors.load(Ordering::SeqCst),
            messages_forwarded: self.messages_forwarded.load(Ordering::SeqCst),
            sse_connections_total: self.sse_connections_total.load(Ordering::SeqCst),
            ws_connections_total: self.ws_connections_total.load(Ordering::SeqCst),
            active_sse_connections: self.active_sse_connections.load(Ordering::SeqCst),
            active_ws_connections: self.active_ws_connections.load(Ordering::SeqCst),
            system: self.system.read().await.clone(),
        }
    }

    // Get health status
    pub fn health(&self, start_time: std::time::Instant) -> HealthStatus {
        let nats_connected = self.nats_connected.load(Ordering::SeqCst);
        let active_sse = self.active_sse_connections.load(Ordering::SeqCst);
        let active_ws = self.active_ws_connections.load(Ordering::SeqCst);

        HealthStatus {
            status: if nats_connected { "healthy" } else { "degraded" },
            nats_connected,
            active_connections: active_sse + active_ws,
            messages_forwarded: self.messages_forwarded.load(Ordering::SeqCst),
            uptime_seconds: start_time.elapsed().as_secs(),
        }
    }
}

// Background task to periodically update system metrics
pub async fn metrics_updater(metrics: Arc<Metrics>) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
    loop {
        interval.tick().await;
        metrics.update_system_metrics().await;
    }
}
