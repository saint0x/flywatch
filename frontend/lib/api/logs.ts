import type { FlyLog, LogBufferSummary } from "@/lib/types/api"
import { apiFetch, createWebSocket, apiConfig } from "./client"

// ============================================================================
// REST API
// ============================================================================

export async function getLogBufferStats(): Promise<LogBufferSummary> {
  return apiFetch<LogBufferSummary>("/logs/buffer/stats")
}

export interface HistoricalLog {
  timestamp: string
  raw: string
  level: string | null
  instance: string | null
  region: string | null
  message: string | null
}

export interface HistoryResponse {
  logs: HistoricalLog[]
  total_count: number
  has_more: boolean
}

/**
 * Fetch historical logs before a given timestamp
 * @param before - RFC3339 timestamp, fetch logs before this time
 * @param limit - Max number of logs to fetch (default 100, max 1000)
 */
export async function fetchHistoricalLogs(before?: string, limit = 100): Promise<HistoryResponse> {
  const params = new URLSearchParams()
  if (before) params.set("before", before)
  params.set("limit", String(Math.min(limit, 1000)))

  const queryString = params.toString()
  const url = `/logs/history${queryString ? `?${queryString}` : ""}`

  return apiFetch<HistoryResponse>(url)
}

// ============================================================================
// WEBSOCKET STREAMING
// ============================================================================

export interface LogStreamCallbacks {
  onLog: (log: FlyLog) => void
  onError?: (error: Event | string) => void
  onClose?: () => void
  onOpen?: () => void
}

export interface LogStreamConnection {
  close: () => void
  isConnected: () => boolean
}

export function connectToLogStream(callbacks: LogStreamCallbacks): LogStreamConnection {
  let ws: WebSocket | null = null
  let isConnected = false
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  const connect = () => {
    try {
      ws = createWebSocket("/logs/ws")

      ws.onopen = () => {
        isConnected = true
        reconnectAttempts = 0
        callbacks.onOpen?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle error messages from server
          if (data.type === "error") {
            callbacks.onError?.(data.message)
            return
          }

          // Handle close messages from server
          if (data.type === "close") {
            callbacks.onClose?.()
            return
          }

          // Parse Fly.io log format
          const log = parseFlyLog(data)
          if (log) {
            callbacks.onLog(log)
          }
        } catch {
          // Raw log message (not JSON wrapped)
          try {
            const log = parseFlyLog(JSON.parse(event.data))
            if (log) {
              callbacks.onLog(log)
            }
          } catch {
            console.warn("Failed to parse log message:", event.data)
          }
        }
      }

      ws.onerror = (error) => {
        isConnected = false
        callbacks.onError?.(error)
      }

      ws.onclose = () => {
        isConnected = false
        callbacks.onClose?.()

        // Attempt reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          setTimeout(connect, reconnectDelay)
        }
      }
    } catch (error) {
      callbacks.onError?.(String(error))
    }
  }

  connect()

  return {
    close: () => {
      reconnectAttempts = maxReconnectAttempts // Prevent reconnect
      ws?.close()
      ws = null
      isConnected = false
    },
    isConnected: () => isConnected,
  }
}

// ============================================================================
// SSE STREAMING (alternative to WebSocket)
// ============================================================================

export function connectToLogSSE(callbacks: LogStreamCallbacks): LogStreamConnection {
  let eventSource: EventSource | null = null
  let isConnected = false

  try {
    const url = `${apiConfig.baseUrl}/logs/stream`
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      isConnected = true
      callbacks.onOpen?.()
    }

    eventSource.onmessage = (event) => {
      try {
        const log = parseFlyLog(JSON.parse(event.data))
        if (log) {
          callbacks.onLog(log)
        }
      } catch {
        console.warn("Failed to parse SSE log message:", event.data)
      }
    }

    eventSource.onerror = (error) => {
      isConnected = false
      callbacks.onError?.(error)
    }
  } catch (error) {
    callbacks.onError?.(String(error))
  }

  return {
    close: () => {
      eventSource?.close()
      eventSource = null
      isConnected = false
    },
    isConnected: () => isConnected,
  }
}

// ============================================================================
// LOG PARSING
// ============================================================================

function parseFlyLog(data: unknown): FlyLog | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const raw = data as Record<string, unknown>

  // Validate required fields exist
  if (!raw.timestamp || !raw.message) {
    return null
  }

  // Build FlyLog from raw data
  return {
    event: {
      provider: (raw.event as { provider?: string })?.provider === "fly" ? "fly" : "app",
    },
    fly: {
      app: {
        instance: (raw.fly as { app?: { instance?: string } })?.app?.instance || "unknown",
        name: (raw.fly as { app?: { name?: string } })?.app?.name || "unknown",
      },
      region: ((raw.fly as { region?: string })?.region as FlyLog["fly"]["region"]) || "unknown",
    },
    log: {
      level: ((raw.log as { level?: string })?.level as FlyLog["log"]["level"]) || "info",
    },
    message: String(raw.message),
    timestamp: String(raw.timestamp),
  }
}

/**
 * Convert a HistoricalLog (from history API) to FlyLog format (for UI consistency)
 */
export function historicalLogToFlyLog(log: HistoricalLog): FlyLog | null {
  try {
    // Try to parse the raw JSON to get full metadata
    const raw = JSON.parse(log.raw) as Record<string, unknown>
    return parseFlyLog(raw)
  } catch {
    // Fallback: construct from individual fields
    return {
      event: { provider: "fly" },
      fly: {
        app: {
          instance: log.instance || "unknown",
          name: "unknown",
        },
        region: (log.region as FlyLog["fly"]["region"]) || "unknown",
      },
      log: {
        level: (log.level as FlyLog["log"]["level"]) || "info",
      },
      message: log.message || "",
      timestamp: log.timestamp,
    }
  }
}
