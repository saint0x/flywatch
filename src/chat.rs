use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tracing::{error, info, warn};

use crate::http::AppState;
use crate::log_buffer::LogBuffer;
use crate::metrics::Metrics;
use crate::pricing::{CostBreakdown, ModelPricing};
use crate::prompt::{
    build_initial_context, build_system_prompt, format_logs_compact, format_metrics_compact,
};

// ==================== Request/Response Types ====================

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    #[serde(default)]
    pub model: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub response: String,
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<TokenUsage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<CostBreakdown>,
    pub tools_called: Vec<String>,
    pub processing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

// ==================== OpenRouter API Types ====================

#[derive(Debug, Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Tool>>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Message {
    role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_call_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ToolCall {
    id: String,
    #[serde(rename = "type")]
    call_type: String,
    function: FunctionCall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FunctionCall {
    name: String,
    arguments: String,
}

#[derive(Debug, Clone, Serialize)]
struct Tool {
    #[serde(rename = "type")]
    tool_type: String,
    function: FunctionDefinition,
}

#[derive(Debug, Clone, Serialize)]
struct FunctionDefinition {
    name: String,
    description: String,
    parameters: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    choices: Vec<Choice>,
    model: String,
    usage: Option<OpenRouterUsage>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: Message,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

// ==================== Tool Definitions ====================

fn get_tools() -> Vec<Tool> {
    vec![
        Tool {
            tool_type: "function".to_string(),
            function: FunctionDefinition {
                name: "get_logs".to_string(),
                description: "Fetch logs from the buffer. Use 'count' for last N logs or 'minutes' for time-based retrieval.".to_string(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "count": {
                            "type": "integer",
                            "description": "Number of recent logs to fetch (e.g., 50, 100, 500)"
                        },
                        "minutes": {
                            "type": "integer",
                            "description": "Fetch logs from the last X minutes"
                        }
                    }
                }),
            },
        },
        Tool {
            tool_type: "function".to_string(),
            function: FunctionDefinition {
                name: "get_metrics".to_string(),
                description: "Fetch current system metrics including CPU, memory, and connection information.".to_string(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["cpu", "memory", "connections", "all"],
                            "description": "Type of metrics to fetch"
                        }
                    }
                }),
            },
        },
    ]
}

// ==================== Tool Execution ====================

#[derive(Debug, Deserialize)]
struct GetLogsArgs {
    count: Option<usize>,
    minutes: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct GetMetricsArgs {
    #[serde(rename = "type")]
    metric_type: Option<String>,
}

async fn execute_tool(
    tool_name: &str,
    arguments: &str,
    log_buffer: &Arc<LogBuffer>,
    metrics: &Arc<Metrics>,
    start_time: Instant,
) -> Result<String, String> {
    match tool_name {
        "get_logs" => {
            let args: GetLogsArgs =
                serde_json::from_str(arguments).map_err(|e| format!("Invalid arguments: {}", e))?;

            let logs = if let Some(minutes) = args.minutes {
                log_buffer.get_last_minutes(minutes).await
            } else {
                let count = args.count.unwrap_or(50);
                log_buffer.get_last_n(count).await
            };

            Ok(format!(
                "Retrieved {} logs:\n{}",
                logs.len(),
                format_logs_compact(&logs)
            ))
        }
        "get_metrics" => {
            let args: GetMetricsArgs =
                serde_json::from_str(arguments).map_err(|e| format!("Invalid arguments: {}", e))?;

            let snapshot = metrics.snapshot(start_time).await;
            let metric_type = args.metric_type.as_deref().unwrap_or("all");

            let result = match metric_type {
                "cpu" => {
                    snapshot.system.as_ref().map_or(
                        "CPU metrics not available".to_string(),
                        |s| format!("CPU Usage: {:.1}%", s.cpu_usage_percent),
                    )
                }
                "memory" => {
                    snapshot.system.as_ref().map_or(
                        "Memory metrics not available".to_string(),
                        |s| {
                            format!(
                                "Memory: {:.0}MB / {:.0}MB ({:.1}%)",
                                s.memory_used_bytes as f64 / (1024.0 * 1024.0),
                                s.memory_total_bytes as f64 / (1024.0 * 1024.0),
                                s.memory_usage_percent
                            )
                        },
                    )
                }
                "connections" => {
                    format!(
                        "Connections - SSE: {} active ({} total), WebSocket: {} active ({} total)",
                        snapshot.active_sse_connections,
                        snapshot.sse_connections_total,
                        snapshot.active_ws_connections,
                        snapshot.ws_connections_total
                    )
                }
                _ => format_metrics_compact(&snapshot),
            };

            Ok(result)
        }
        _ => Err(format!("Unknown tool: {}", tool_name)),
    }
}

// ==================== OpenRouter Client ====================

pub struct OpenRouterClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl OpenRouterClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .expect("Failed to create HTTP client"),
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
        }
    }

    async fn chat(
        &self,
        model: &str,
        messages: Vec<Message>,
        tools: Option<Vec<Tool>>,
    ) -> Result<OpenRouterResponse, ChatError> {
        let request = OpenRouterRequest {
            model: model.to_string(),
            messages,
            tools,
            max_tokens: 4096,
            temperature: 0.3,
        };

        let response = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("HTTP-Referer", "https://flywatch.app")
            .header("X-Title", "Flywatch Log Analyzer")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| ChatError::Network(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(ChatError::Api(format!(
                "OpenRouter API error {}: {}",
                status, body
            )));
        }

        response
            .json()
            .await
            .map_err(|e| ChatError::Parse(e.to_string()))
    }
}

// ==================== Error Handling ====================

#[derive(Debug)]
pub enum ChatError {
    Network(String),
    Api(String),
    Parse(String),
    Config(String),
    MaxIterations,
}

impl IntoResponse for ChatError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ChatError::Network(msg) => (StatusCode::BAD_GATEWAY, msg),
            ChatError::Api(msg) => (StatusCode::BAD_GATEWAY, msg),
            ChatError::Parse(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            ChatError::Config(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            ChatError::MaxIterations => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Max tool iterations exceeded".to_string(),
            ),
        };

        let body = serde_json::json!({
            "error": message,
            "status": status.as_u16()
        });

        (status, Json(body)).into_response()
    }
}

// ==================== Chat Handler ====================

const MAX_TOOL_ITERATIONS: usize = 10;

pub async fn chat_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, Response> {
    let start = Instant::now();

    // Auth check
    crate::http::check_auth(&state, &headers)?;

    // Check if OpenRouter is configured
    let api_key = state
        .config
        .openrouter_api_key
        .as_ref()
        .ok_or_else(|| {
            ChatError::Config("OPENROUTER_API_KEY not configured".to_string()).into_response()
        })?;

    let model = request
        .model
        .unwrap_or_else(|| state.config.openrouter_model.clone());

    // Build initial context
    let metrics_snapshot = state.metrics.snapshot(state.start_time).await;
    let log_summary = state.log_buffer.get_summary().await;
    let recent_logs = state.log_buffer.get_last_n(150).await;
    let initial_context = build_initial_context(&metrics_snapshot, &log_summary, &recent_logs);

    // Initialize messages
    let mut messages = vec![
        Message {
            role: "system".to_string(),
            content: Some(build_system_prompt().to_string()),
            tool_calls: None,
            tool_call_id: None,
        },
        Message {
            role: "user".to_string(),
            content: Some(format!(
                "{}\n\n## User Question\n{}",
                initial_context, request.message
            )),
            tool_calls: None,
            tool_call_id: None,
        },
    ];

    let client = OpenRouterClient::new(api_key.clone());
    let tools = get_tools();
    let mut tools_called: Vec<String> = Vec::new();

    info!(
        model = %model,
        message_len = request.message.len(),
        "Processing chat request"
    );

    // Tool loop
    for iteration in 0..MAX_TOOL_ITERATIONS {
        let response = client
            .chat(&model, messages.clone(), Some(tools.clone()))
            .await
            .map_err(|e| {
                error!(error = ?e, "OpenRouter API call failed");
                e.into_response()
            })?;

        let choice = response.choices.first().ok_or_else(|| {
            ChatError::Parse("No choices in response".to_string()).into_response()
        })?;

        // Check if the model wants to call tools
        if let Some(ref tool_calls) = choice.message.tool_calls {
            if tool_calls.is_empty() {
                // No more tools to call, return the response
                let response_text = choice.message.content.clone().unwrap_or_default();
                let usage = response.usage.map(|u| TokenUsage {
                    prompt_tokens: u.prompt_tokens,
                    completion_tokens: u.completion_tokens,
                    total_tokens: u.total_tokens,
                });
                let cost = usage.as_ref().map(|u| {
                    ModelPricing::for_model(&response.model)
                        .calculate_cost(u.prompt_tokens, u.completion_tokens)
                });
                let processing_time_ms = start.elapsed().as_millis() as u64;

                // Record usage for persistence
                if let Some(ref c) = cost {
                    state.usage_tracker.record(&response.model, c, processing_time_ms, &tools_called).await;
                }

                return Ok(Json(ChatResponse {
                    response: response_text,
                    model: response.model,
                    usage,
                    cost,
                    tools_called,
                    processing_time_ms,
                }));
            }

            // Add assistant message with tool calls
            messages.push(Message {
                role: "assistant".to_string(),
                content: choice.message.content.clone(),
                tool_calls: Some(tool_calls.clone()),
                tool_call_id: None,
            });

            // Execute each tool call
            for tool_call in tool_calls {
                let tool_name = &tool_call.function.name;
                let tool_args = &tool_call.function.arguments;

                info!(
                    tool = %tool_name,
                    iteration = iteration,
                    "Executing tool call"
                );

                tools_called.push(format!("{}({})", tool_name, tool_args));

                let result = execute_tool(
                    tool_name,
                    tool_args,
                    &state.log_buffer,
                    &state.metrics,
                    state.start_time,
                )
                .await
                .unwrap_or_else(|e| format!("Error: {}", e));

                // Add tool result message
                messages.push(Message {
                    role: "tool".to_string(),
                    content: Some(result),
                    tool_calls: None,
                    tool_call_id: Some(tool_call.id.clone()),
                });
            }
        } else {
            // No tool calls, return the final response
            let response_text = choice.message.content.clone().unwrap_or_default();

            info!(
                model = %response.model,
                tools_called = tools_called.len(),
                processing_time_ms = start.elapsed().as_millis(),
                "Chat request completed"
            );

            let usage = response.usage.map(|u| TokenUsage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            });
            let cost = usage.as_ref().map(|u| {
                ModelPricing::for_model(&response.model)
                    .calculate_cost(u.prompt_tokens, u.completion_tokens)
            });
            let processing_time_ms = start.elapsed().as_millis() as u64;

            // Record usage for persistence
            if let Some(ref c) = cost {
                state.usage_tracker.record(&response.model, c, processing_time_ms, &tools_called).await;
            }

            return Ok(Json(ChatResponse {
                response: response_text,
                model: response.model,
                usage,
                cost,
                tools_called,
                processing_time_ms,
            }));
        }
    }

    warn!("Max tool iterations exceeded");
    Err(ChatError::MaxIterations.into_response())
}
