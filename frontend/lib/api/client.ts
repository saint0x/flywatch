import type { ApiConfig } from "@/lib/types/api"

// API configuration - in development, Vite proxy handles /api/* routes
// In production, this should point to the backend URL
const getApiConfig = (): ApiConfig => {
  const baseUrl = import.meta.env.VITE_API_URL || ""
  const authToken = import.meta.env.VITE_AUTH_TOKEN || undefined

  return { baseUrl, authToken }
}

export const apiConfig = getApiConfig()

// Helper to build headers with optional auth
export function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (apiConfig.authToken) {
    headers["Authorization"] = `Bearer ${apiConfig.authToken}`
  }

  return headers
}

// Generic fetch wrapper with error handling
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${apiConfig.baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error")
    throw new Error(`API Error ${response.status}: ${errorBody}`)
  }

  return response.json()
}

// WebSocket connection helper
export function createWebSocket(endpoint: string): WebSocket {
  let wsUrl: string

  if (apiConfig.baseUrl) {
    // Production: derive protocol from API URL
    const url = new URL(apiConfig.baseUrl)
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:"
    wsUrl = `${wsProtocol}//${url.host}${endpoint}`
  } else {
    // Development: use same host as page (Vite will proxy)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    wsUrl = `${protocol}//${window.location.host}${endpoint}`
  }

  return new WebSocket(wsUrl)
}

// SSE connection helper
export function createEventSource(endpoint: string): EventSource {
  const url = `${apiConfig.baseUrl}${endpoint}`
  return new EventSource(url)
}
