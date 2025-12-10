// ============================================================================
// LOG TYPES (matches backend NATS message format from Fly.io)
// ============================================================================

export type LogLevel = "info" | "warn" | "error" | "debug"
export type Provider = "app" | "fly"
export type Region = "ewr" | "iad" | "lax" | "sfo" | "sin" | "syd" | "fra" | string

export interface FlyLogEvent {
  provider: Provider
}

export interface FlyAppInfo {
  instance: string
  name: string
}

export interface FlyInfo {
  app: FlyAppInfo
  region: Region
}

export interface FlyLogLevel {
  level: LogLevel
}

export interface FlyLog {
  event: FlyLogEvent
  fly: FlyInfo
  log: FlyLogLevel
  message: string
  timestamp: string
}

// ============================================================================
// METRICS TYPES (matches backend MetricsSnapshot)
// ============================================================================

export interface SystemMetrics {
  cpu_usage_percent: number
  memory_used_bytes: number
  memory_total_bytes: number
  memory_usage_percent: number
  uptime_seconds: number
}

export interface MetricsSnapshot {
  timestamp: string
  uptime_seconds: number
  nats_connected: boolean
  subscription_errors: number
  messages_forwarded: number
  sse_connections_total: number
  ws_connections_total: number
  active_sse_connections: number
  active_ws_connections: number
  system?: SystemMetrics
}

// WebSocket metrics event wrapper
export interface MetricsEvent {
  type: "metrics"
  data: MetricsSnapshot
}

export interface MetricsErrorEvent {
  type: "error"
  code: string
  message: string
}

export type MetricsWsMessage = MetricsEvent | MetricsErrorEvent

// ============================================================================
// HEALTH TYPES (matches backend HealthStatus)
// ============================================================================

export interface HealthResponse {
  status: "healthy" | "degraded"
  nats_connected: boolean
  active_connections: number
  messages_forwarded: number
  uptime_seconds: number
}

// ============================================================================
// CHAT TYPES (matches backend ChatRequest/ChatResponse)
// ============================================================================

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface CostBreakdown {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  input_cost_usd: number
  output_cost_usd: number
  total_cost_usd: number
  model_input_price_per_million: number
  model_output_price_per_million: number
}

export interface ChatRequest {
  message: string
  model?: string
}

export interface ChatResponse {
  response: string
  model: string
  usage?: TokenUsage
  cost?: CostBreakdown
  tools_called: string[]
  processing_time_ms: number
}

// ============================================================================
// LOG BUFFER STATS (matches backend LogSummary)
// ============================================================================

export interface LogBufferSummary {
  total_count: number
  oldest_timestamp: string | null
  newest_timestamp: string | null
  error_count: number
  warn_count: number
  recent_errors: string[]
  active_instances: string[]
}

// ============================================================================
// USAGE STATS (matches backend UsageStats)
// ============================================================================

export interface UsageStats {
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  requests_by_model: Record<string, number>
  cost_by_model: Record<string, number>
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

export interface ApiConfig {
  baseUrl: string
  authToken?: string
}
