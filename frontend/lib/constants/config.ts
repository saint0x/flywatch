/**
 * Application configuration constants
 */

export const API_CONFIG = {
  BASE_URL: "https://flywatch.fly.dev",
  ENDPOINTS: {
    HEALTH: "/health",
    CHAT: "/chat",
    LOGS_SSE: "/logs/stream",
    LOGS_WS: "/logs/ws",
  },
  TIMEOUTS: {
    CHAT: 60000, // 60 seconds
    HEALTH_CHECK: 5000, // 5 seconds
  },
} as const

export const LOG_CONFIG = {
  MAX_BUFFER_SIZE: 10000,
  MAX_DISPLAY_LOGS: 100,
  INITIAL_LOGS_COUNT: 20,
  STREAM_INTERVAL_MIN: 1500, // ms
  STREAM_INTERVAL_MAX: 3000, // ms
} as const

export const METRICS_CONFIG = {
  UPDATE_INTERVAL: 2000, // ms
  CPU_WARNING_THRESHOLD: 80,
  MEMORY_WARNING_THRESHOLD: 85,
} as const

export const CHAT_CONFIG = {
  DEFAULT_MODEL: "moonshotai/kimi-k2",
  RESPONSE_DISPLAY_DURATION: 8000, // ms
  MAX_MESSAGE_LENGTH: 500,
} as const

export const UI_CONFIG = {
  ANIMATION_DURATION: 300, // ms
  AUTO_SCROLL_THRESHOLD: 10, // px from bottom
} as const

export const SUPPORTED_REGIONS = ["ewr", "iad", "lax", "sfo", "sin", "syd", "fra"] as const

export const SUPPORTED_MODELS = {
  "moonshotai/kimi-k2": { input: 0.456, output: 1.84 },
  "anthropic/claude-3.5-sonnet": { input: 3.0, output: 15.0 },
  "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
  "anthropic/claude-3-opus": { input: 15.0, output: 75.0 },
  "openai/gpt-4-turbo": { input: 10.0, output: 30.0 },
  "openai/gpt-4o": { input: 2.5, output: 10.0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
} as const
