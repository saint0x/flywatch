mod config;
mod http;
mod metrics;
mod nats;

use std::sync::Arc;
use std::time::Instant;
use tokio::sync::broadcast;
use tracing::{info, Level};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

use crate::config::Config;
use crate::http::{create_router, AppState};
use crate::metrics::{metrics_updater, Metrics};
use crate::nats::{LogMessage, NatsSubscriber};

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

    // Create broadcast channel for log distribution
    let (log_tx, _) = broadcast::channel::<LogMessage>(CHANNEL_CAPACITY);

    // Create app state
    let state = AppState {
        config: config.clone(),
        metrics: metrics.clone(),
        log_tx: log_tx.clone(),
        start_time: Instant::now(),
    };

    // Spawn metrics updater
    let metrics_clone = metrics.clone();
    tokio::spawn(async move {
        metrics_updater(metrics_clone).await;
    });

    // Spawn NATS subscriber
    let subscriber = NatsSubscriber::new(config.clone(), metrics.clone(), log_tx);
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
