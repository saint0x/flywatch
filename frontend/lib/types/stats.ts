// ============================================================================
// SYSTEM METRICS (/api/flywatchdev/metrics)
// ============================================================================

export interface SystemStatsMetrics {
  timestamp: string
  cpu_usage_percent: number
  memory_used_bytes: number
  memory_total_bytes: number
  memory_usage_percent: number
  uptime_seconds: number
  bun_version?: string
  platform?: string
}

export interface PerformanceMetrics {
  averageLatency: number
  latencyPercentiles: {
    p50: number
    p90: number
    p95: number
    p99: number
  }
  byOperation?: Record<string, { average: number; min: number; max: number }>
}

export interface MetricsResponse {
  system: SystemStatsMetrics
  performance: PerformanceMetrics
  summary: {
    requests_total: number
    requests_per_second: number
    active_connections: number
    error_count_5xx: number
    error_count_4xx: number
  }
}

// ============================================================================
// SERVICES (/api/flywatchdev/services)
// ============================================================================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

export interface CircuitBreakerStats {
  state: CircuitState
  totalRequests: number
  failedRequests: number
  failureCount: number
  successCount: number
  successRate: string
  lastFailureTime: string | null
}

export interface RateLimiterStats {
  activeBuckets: number
  activeFallbackBuckets: number
  pendingAnalytics: number
  memoryUsage: string
}

export interface ServicesResponse {
  circuitBreakers: Record<string, CircuitBreakerStats>
  rateLimiter: RateLimiterStats
  services: {
    unavailable: string[]
    healthy: string[]
  }
}

// ============================================================================
// BUSINESS (/api/flywatchdev/business)
// ============================================================================

export interface ApiCallsStats {
  total: number
  byEndpoint?: Record<string, number>
  byMethod?: Record<string, number>
  byStatusCode?: Record<string, number>
}

export interface AgentInteractionsStats {
  total: number
  byAgent?: Record<string, number>
  byType?: Record<string, number>
}

export interface ConversationsStats {
  total: number
  averageDuration: number
  averageMessageCount: number
}

export interface VapiCallsStats {
  totalCalls: number
  totalDurationMs: number
  averageDurationMs: number
  callsByEndedReason?: Record<string, number>
}

export interface ResourceUsageStats {
  byType?: Record<string, number>
  byOperation?: Record<string, number>
}

export interface UsageStats {
  apiCalls: ApiCallsStats
  agentInteractions: AgentInteractionsStats
  conversations: ConversationsStats
  resourceUsage: ResourceUsageStats
  vapiCalls: VapiCallsStats
}

export interface ErrorStats {
  total: number
  errorRate: number
  byType?: Record<string, number>
  recent?: Array<{
    error: { name: string; message: string; stack?: string }
    context?: Record<string, unknown>
    timestamp: number
  }>
}

export interface JobStats {
  total: number
  byStatus: {
    pending: number
    processing: number
    completed: number
    failed: number
    cancelled: number
  }
  byType?: Record<string, number>
  avgProcessingTime: number
  errorRate: number
}

export interface InternalMetrics {
  timestamp: string
  calls: {
    totalCalls: number
    avgDuration: number
    totalDuration: number
    byOutcome?: Record<string, number>
    failedCalls: number
    failureRate: number
  }
  messages: {
    totalMessages: number
    messageRate: number
    byDirection?: Record<string, number>
  }
}

export interface BusinessResponse {
  usage: UsageStats
  errors: ErrorStats
  jobs: JobStats
  internalMetrics: InternalMetrics
}

// ============================================================================
// COMBINED STATS (for hook)
// ============================================================================

export interface StatsData {
  metrics: MetricsResponse | null
  services: ServicesResponse | null
  business: BusinessResponse | null
}

// ============================================================================
// STAT CARD DEFINITION (for grid)
// ============================================================================

export type StatCardType = "number" | "percentage" | "duration" | "rate" | "status"

export interface StatCardDefinition {
  id: string
  label: string
  category: "system" | "services" | "business"
  type: StatCardType
  icon: string
  getValue: (data: StatsData) => number | string | null
  getSubtext?: (data: StatsData) => string | null
  getStatus?: (data: StatsData) => "healthy" | "warning" | "error"
}
