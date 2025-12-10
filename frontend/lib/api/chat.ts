import type { ChatRequest, ChatResponse, UsageStats } from "@/lib/types/api"
import { apiFetch } from "./client"

// ============================================================================
// CHAT API
// ============================================================================

export async function sendChatMessage(message: string, model?: string): Promise<ChatResponse> {
  const request: ChatRequest = {
    message,
    model,
  }

  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// ============================================================================
// USAGE STATS
// ============================================================================

export async function getUsageStats(): Promise<UsageStats> {
  return apiFetch<UsageStats>("/usage")
}
