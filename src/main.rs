mod chat;
mod config;
mod http;
mod log_buffer;
mod metrics;
mod nats;
mod pricing;
mod prompt;
mod usage;

use std::sync::Arc;
use std::time::Instant;
use tokio::sync::broadcast;
use tracing::{info, Level};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

use crate::config::Config;
use crate::http::{create_router, AppState};
use crate::log_buffer::{LogBuffer, LogBufferConfig};
use crate::metrics::{metrics_updater, Metrics};
use crate::nats::{LogMessage, NatsSubscriber};
use crate::usage::UsageTracker;

const CHANNEL_CAPACITY: usize = 10_000;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(fmt::layer().json())
        .with(
            EnvFilter::builder()
                .with_default_directive(Level::INFO.into())
                .from_env_lossy(),
        )
        .init();

    info!("Starting flywatch log forwarder");

    // Load configuration
    let config = Arc::new(Config::from_env());
    info!(
        app = %config.fly_prod_app_name,
        nats_url = %config.nats_url,
        "Configuration loaded"
    );

    // Initialize metrics
    let metrics = Metrics::new();

    // Create log buffer for AI access with persistence
    let log_buffer_config = LogBufferConfig {
        max_entries: config.log_buffer_max_entries,
        max_age_minutes: config.log_buffer_max_age_minutes,
    };
    let log_buffer = LogBuffer::new(log_buffer_config, config.store_path.as_deref());

    info!(
        max_entries = config.log_buffer_max_entries,
        max_age_minutes = config.log_buffer_max_age_minutes,
        store_path = ?config.store_path,
        "Log buffer initialized"
    );

    // Create usage tracker for AI cost persistence
    let usage_tracker = Arc::new(UsageTracker::new(config.store_path.as_deref()));

    // Create broadcast channel for log distribution
    let (log_tx, _) = broadcast::channel::<LogMessage>(CHANNEL_CAPACITY);

    // Create app state
    let state = AppState {
        config: config.clone(),
        metrics: metrics.clone(),
        log_tx: log_tx.clone(),
        log_buffer: log_buffer.clone(),
        usage_tracker,
        start_time: Instant::now(),
    };

    // Spawn metrics updater
    let metrics_clone = metrics.clone();
    tokio::spawn(async move {
        metrics_updater(metrics_clone).await;
    });

    // Spawn NATS subscriber
    let subscriber = NatsSubscriber::new(config.clone(), metrics.clone(), log_tx, log_buffer);
    tokio::spawn(async move {
        subscriber.run().await;
    });

    // Create router and start server
    let app = create_router(state);
    let bind_addr = config.bind_addr();

    info!(addr = %bind_addr, "Starting HTTP server");

    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .expect("Failed to bind to address");

    info!(addr = %bind_addr, "Server listening");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
