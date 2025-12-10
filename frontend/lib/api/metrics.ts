import type { MetricsSnapshot, HealthResponse, MetricsWsMessage } from "@/lib/types/api"
import { apiFetch, createWebSocket } from "./client"

// ============================================================================
// REST API
// ============================================================================

export async function getMetrics(): Promise<MetricsSnapshot> {
  return apiFetch<MetricsSnapshot>("/metrics")
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health")
}

export async function checkReady(): Promise<boolean> {
  try {
    const response = await fetch("/ready")
    return response.ok
  } catch {
    return false
  }
}

// ============================================================================
// WEBSOCKET STREAMING
// ============================================================================

export interface MetricsStreamCallbacks {
  onMetrics: (metrics: MetricsSnapshot) => void
  onError?: (error: Event | string) => void
  onClose?: () => void
  onOpen?: () => void
}

export interface MetricsStreamConnection {
  close: () => void
  isConnected: () => boolean
}

export function connectToMetricsStream(callbacks: MetricsStreamCallbacks): MetricsStreamConnection {
  let ws: WebSocket | null = null
  let isConnected = false
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  const connect = () => {
    try {
      ws = createWebSocket("/metrics/ws")

      ws.onopen = () => {
        isConnected = true
        reconnectAttempts = 0
        callbacks.onOpen?.()
      }

      ws.onmessage = (event) => {
        try {
          const message: MetricsWsMessage = JSON.parse(event.data)

          if (message.type === "error") {
            callbacks.onError?.(message.message)
            return
          }

          if (message.type === "metrics") {
            callbacks.onMetrics(message.data)
          }
        } catch {
          console.warn("Failed to parse metrics message:", event.data)
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
