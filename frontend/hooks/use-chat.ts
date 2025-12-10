import { useState, useCallback } from "react"
import type { ChatResponse } from "@/lib/types/api"
import { sendChatMessage } from "@/lib/api/chat"

export function useChat() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null)

  const sendMessage = useCallback(async (message: string, model?: string): Promise<ChatResponse | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await sendChatMessage(message, model)
      setLastResponse(response)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message"
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearResponse = useCallback(() => {
    setLastResponse(null)
  }, [])

  return {
    sendMessage,
    isLoading,
    error,
    lastResponse,
    clearError,
    clearResponse,
  }
}
