import { useState, useEffect, useRef } from "react"
import { LogStream } from "@/components/log-stream"
import { SystemMetrics } from "@/components/system-metrics"
import { FloatingChatBar } from "@/components/floating-chat-bar"
import { ChatResponse } from "@/components/chat-response"
import { useChat } from "@/hooks/use-chat"
import type { ChatResponse as ChatResponseType } from "@/lib/types/api"

export function App() {
  const { sendMessage, isLoading } = useChat()
  const [activeResponse, setActiveResponse] = useState<ChatResponseType | null>(null)
  const [responseVisible, setResponseVisible] = useState(false)
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSendMessage = async (message: string) => {
    const response = await sendMessage(message)

    if (response) {
      setActiveResponse(response)
      setResponseVisible(true)

      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
      }

      responseTimeoutRef.current = setTimeout(() => {
        setResponseVisible(false)
        setTimeout(() => setActiveResponse(null), 300)
      }, 8000)
    }
  }

  const handleResponseHover = (isHovering: boolean) => {
    if (isHovering && responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current)
    } else if (!isHovering && activeResponse) {
      responseTimeoutRef.current = setTimeout(() => {
        setResponseVisible(false)
        setTimeout(() => setActiveResponse(null), 300)
      }, 8000)
    }
  }

  useEffect(() => {
    return () => {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-1 flex flex-col font-sans antialiased">
      <SystemMetrics />

      <div className={`flex-1 px-4 transition-all duration-300 ${activeResponse ? "pb-32" : "pb-24"}`}>
        <LogStream hasActiveChat={!!activeResponse} />
      </div>

      {activeResponse && (
        <ChatResponse response={activeResponse} visible={responseVisible} onHover={handleResponseHover} />
      )}

      <FloatingChatBar onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}
