use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{header, HeaderMap, StatusCode},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Response,
    },
    routing::{get, post},
    Json, Router,
};
use futures::{SinkExt, StreamExt};
use serde::Serialize;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{debug, error, info, warn};

use crate::chat::chat_handler;
use crate::config::Config;
use crate::log_buffer::{LogBuffer, LogSummary};
use crate::metrics::{HealthStatus, Metrics, MetricsSnapshot};
use crate::nats::LogMessage;
use crate::usage::{UsageStats, UsageTracker};

const WS_PING_INTERVAL: Duration = Duration::from_secs(30);
const WS_PONG_TIMEOUT: Duration = Duration::from_secs(10);
const WS_MAX_FRAME_SIZE: usize = 64 * 1024;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub metrics: Arc<Metrics>,
    pub log_tx: broadcast::Sender<LogMessage>,
    pub log_buffer: Arc<LogBuffer>,
    pub usage_tracker: Arc<UsageTracker>,
    pub start_time: Instant,
}

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health_handler))
        .route("/healthz", get(health_handler))
        .route("/ready", get(ready_handler))
        .route("/metrics", get(metrics_handler))
        .route("/logs/stream", get(sse_handler))
        .route("/logs/ws", get(ws_handler))
        .route("/metrics/ws", get(metrics_ws_handler))
        .route("/chat", post(chat_handler))
        .route("/logs/buffer/stats", get(logs_stats_handler))
        .route("/usage", get(usage_handler))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

pub fn check_auth(state: &AppState, headers: &HeaderMap) -> Result<(), Response> {
    if let Some(expected_token) = &state.config.auth_token {
        let auth_header = headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok());

        match auth_header {
            Some(h) if h.starts_with("Bearer ") => {
                let token = &h[7..];
                if token != expected_token {
                    return Err((StatusCode::UNAUTHORIZED, "Invalid token").into_response());
                }
            }
            _ => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    "Missing or invalid Authorization header",
                )
                    .into_response());
            }
        }
    }
    Ok(())
}

async fn health_handler(State(state): State<AppState>) -> Json<HealthStatus> {
    Json(state.metrics.health(state.start_time))
}

async fn ready_handler(State(state): State<AppState>) -> Response {
    if state.metrics.is_nats_connected() {
        (StatusCode::OK, "ready").into_response()
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "not ready - NATS disconnected").into_response()
    }
}

async fn metrics_handler(State(state): State<AppState>) -> Json<MetricsSnapshot> {
    Json(state.metrics.snapshot(state.start_time).await)
}

async fn logs_stats_handler(State(state): State<AppState>) -> Json<LogSummary> {
    Json(state.log_buffer.get_summary().await)
}

async fn usage_handler(State(state): State<AppState>) -> Json<UsageStats> {
    Json(state.usage_tracker.get_stats().await)
}

async fn sse_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Sse<impl futures::Stream<Item = Result<Event, Infallible>>>, Response> {
    check_auth(&state, &headers)?;

    state.metrics.increment_sse_connections();
    let metrics = state.metrics.clone();
    let mut rx = state.log_tx.subscribe();

    let stream = async_stream::stream! {
        loop {
            match rx.recv().await {
                Ok(log_msg) => {
                    yield Ok(Event::default().data(log_msg.raw));
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    warn!(skipped = n, "SSE client lagged");
                    let err_event = serde_json::json!({
                        "type": "error",
                        "message": format!("Lagged {} messages", n)
                    });
                    yield Ok(Event::default().event("error").data(err_event.to_string()));
                }
                Err(broadcast::error::RecvError::Closed) => {
                    break;
                }
            }
        }
        metrics.decrement_active_sse_connections();
        info!("SSE client disconnected");
    };

    Ok(Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("ping"),
    ))
}

async fn ws_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Result<Response, Response> {
    check_auth(&state, &headers)?;
    Ok(ws
        .max_frame_size(WS_MAX_FRAME_SIZE)
        .on_upgrade(move |socket| handle_log_websocket(socket, state)))
}

async fn handle_log_websocket(socket: WebSocket, state: AppState) {
    state.metrics.increment_ws_connections();
    let metrics = state.metrics.clone();
    let connection_id = uuid::Uuid::new_v4();

    info!(connection_id = %connection_id, "WebSocket client connected for logs");

    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.log_tx.subscribe();

    let (ping_tx, mut ping_rx) = tokio::sync::mpsc::channel::<()>(1);
    let last_pong = Arc::new(tokio::sync::Mutex::new(Instant::now()));
    let last_pong_clone = last_pong.clone();

    // Ping task - sends pings and checks for pong timeout
    let ping_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(WS_PING_INTERVAL);
        loop {
            interval.tick().await;

            let last = *last_pong_clone.lock().await;
            if last.elapsed() > WS_PING_INTERVAL + WS_PONG_TIMEOUT {
                warn!(connection_id = %connection_id, "WebSocket pong timeout");
                break;
            }

            if ping_tx.send(()).await.is_err() {
                break;
            }
        }
    });

    // Send task - sends logs and pings
    let last_pong_for_send = last_pong.clone();
    let send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                biased;

                Some(()) = ping_rx.recv() => {
                    debug!("Sending WebSocket ping");
                    if sender.send(Message::Ping(vec![].into())).await.is_err() {
                        break;
                    }
                }

                result = rx.recv() => {
                    match result {
                        Ok(log_msg) => {
                            if log_msg.raw.len() > WS_MAX_FRAME_SIZE {
                                warn!("Log message too large, truncating");
                                let truncated = &log_msg.raw[..WS_MAX_FRAME_SIZE];
                                if sender.send(Message::Text(truncated.to_string().into())).await.is_err() {
                                    break;
                                }
                            } else if sender.send(Message::Text(log_msg.raw.into())).await.is_err() {
                                break;
                            }
                        }
                        Err(broadcast::error::RecvError::Lagged(n)) => {
                            warn!(skipped = n, "WebSocket client lagged");
                            let error_msg = serde_json::json!({
                                "type": "error",
                                "code": "LAGGED",
                                "message": format!("Lagged {} messages", n)
                            });
                            if sender.send(Message::Text(error_msg.to_string().into())).await.is_err() {
                                break;
                            }
                        }
                        Err(broadcast::error::RecvError::Closed) => {
                            let close_msg = serde_json::json!({
                                "type": "close",
                                "code": "CHANNEL_CLOSED",
                                "message": "Log channel closed"
                            });
                            let _ = sender.send(Message::Text(close_msg.to_string().into())).await;
                            break;
                        }
                    }
                }
            }
        }
        let _ = sender.send(Message::Close(None)).await;
        let _ = last_pong_for_send;
    });

    // Receive task - handles incoming messages
    let last_pong_for_recv = last_pong;
    let recv_task = tokio::spawn(async move {
        while let Some(result) = receiver.next().await {
            match result {
                Ok(Message::Pong(_)) => {
                    debug!("Received WebSocket pong");
                    *last_pong_for_recv.lock().await = Instant::now();
                }
                Ok(Message::Ping(data)) => {
                    debug!("Received WebSocket ping, will auto-pong");
                    let _ = data;
                }
                Ok(Message::Close(_)) => {
                    info!("WebSocket client sent close frame");
                    break;
                }
                Ok(Message::Text(text)) => {
                    // Handle client commands if needed
                    if let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&text) {
                        if cmd.get("type").and_then(|t| t.as_str()) == Some("ping") {
                            debug!("Received application-level ping");
                        }
                    }
                }
                Ok(_) => {}
                Err(e) => {
                    warn!(error = %e, "WebSocket receive error");
                    break;
                }
            }
        }
    });

    // Wait for any task to complete
    tokio::select! {
        _ = ping_task => debug!("Ping task ended"),
        _ = send_task => debug!("Send task ended"),
        _ = recv_task => debug!("Recv task ended"),
    }

    metrics.decrement_active_ws_connections();
    info!(connection_id = %connection_id, "WebSocket client disconnected");
}

async fn metrics_ws_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Result<Response, Response> {
    check_auth(&state, &headers)?;
    Ok(ws
        .max_frame_size(WS_MAX_FRAME_SIZE)
        .on_upgrade(move |socket| handle_metrics_websocket(socket, state)))
}

#[derive(Serialize)]
struct MetricsEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    data: MetricsSnapshot,
}

#[derive(Serialize)]
struct ErrorEvent {
    #[serde(rename = "type")]
    event_type: &'static str,
    code: &'static str,
    message: String,
}

async fn handle_metrics_websocket(socket: WebSocket, state: AppState) {
    let connection_id = uuid::Uuid::new_v4();
    info!(connection_id = %connection_id, "WebSocket client connected for metrics");

    let (mut sender, mut receiver) = socket.split();
    let metrics = state.metrics.clone();
    let start_time = state.start_time;

    let last_pong = Arc::new(tokio::sync::Mutex::new(Instant::now()));
    let last_pong_clone = last_pong.clone();

    // Combined send task - metrics + pings
    let send_task = tokio::spawn(async move {
        let mut metrics_interval = tokio::time::interval(Duration::from_secs(1));
        let mut ping_interval = tokio::time::interval(WS_PING_INTERVAL);

        loop {
            tokio::select! {
                biased;

                _ = ping_interval.tick() => {
                    let last = *last_pong_clone.lock().await;
                    if last.elapsed() > WS_PING_INTERVAL + WS_PONG_TIMEOUT {
                        warn!(connection_id = %connection_id, "Metrics WebSocket pong timeout");
                        break;
                    }
                    if sender.send(Message::Ping(vec![].into())).await.is_err() {
                        break;
                    }
                }

                _ = metrics_interval.tick() => {
                    let snapshot = metrics.snapshot(start_time).await;
                    let event = MetricsEvent {
                        event_type: "metrics",
                        data: snapshot,
                    };

                    match serde_json::to_string(&event) {
                        Ok(json) => {
                            if sender.send(Message::Text(json.into())).await.is_err() {
                                break;
                            }
                        }
                        Err(e) => {
                            error!(error = %e, "Failed to serialize metrics");
                            let err = ErrorEvent {
                                event_type: "error",
                                code: "SERIALIZATION_ERROR",
                                message: e.to_string(),
                            };
                            if let Ok(json) = serde_json::to_string(&err) {
                                let _ = sender.send(Message::Text(json.into())).await;
                            }
                        }
                    }
                }
            }
        }
        let _ = sender.send(Message::Close(None)).await;
    });

    let last_pong_for_recv = last_pong;
    let recv_task = tokio::spawn(async move {
        while let Some(result) = receiver.next().await {
            match result {
                Ok(Message::Pong(_)) => {
                    *last_pong_for_recv.lock().await = Instant::now();
                }
                Ok(Message::Close(_)) => break,
                Ok(_) => {}
                Err(e) => {
                    warn!(error = %e, "Metrics WebSocket receive error");
                    break;
                }
            }
        }
    });

    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    info!(connection_id = %connection_id, "Metrics WebSocket client disconnected");
}
