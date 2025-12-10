import { useState, useEffect, useRef, useCallback } from "react"
import type { FlyLog } from "@/lib/types/api"
import type { ProcessedLog } from "@/lib/types/ui"
import { connectToLogStream, type LogStreamConnection } from "@/lib/api/logs"

function transformLog(flyLog: FlyLog): ProcessedLog {
  // Map 'debug' to 'info' for UI display
  let level: ProcessedLog["level"] = flyLog.log.level === "debug" ? "info" : flyLog.log.level

  // Create success variant for certain patterns
  if (
    flyLog.message.includes("successfully") ||
    flyLog.message.includes("completed") ||
    flyLog.message.includes("passed") ||
    flyLog.message.includes("healthy")
  ) {
    level = "success"
  }

  return {
    id: `${flyLog.timestamp}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: flyLog.timestamp,
    level,
    message: flyLog.message,
    region: flyLog.fly.region,
    instance: flyLog.fly.app.instance,
    app_name: flyLog.fly.app.name,
  }
}

export function useLogs(maxLogs = 100) {
  const [logs, setLogs] = useState<ProcessedLog[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shouldAutoScroll = useRef(true)
  const connectionRef = useRef<LogStreamConnection | null>(null)

  const addLog = useCallback(
    (flyLog: FlyLog) => {
      const transformed = transformLog(flyLog)
      setLogs((prev) => {
        const updated = [...prev, transformed]
        return updated.slice(-maxLogs)
      })
    },
    [maxLogs]
  )

  useEffect(() => {
    // Connect to WebSocket log stream
    connectionRef.current = connectToLogStream({
      onLog: addLog,
      onOpen: () => {
        setIsConnected(true)
        setError(null)
      },
      onClose: () => {
        setIsConnected(false)
      },
      onError: (err) => {
        setIsConnected(false)
        setError(typeof err === "string" ? err : "Connection error")
      },
    })

    return () => {
      connectionRef.current?.close()
      connectionRef.current = null
    }
  }, [addLog])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return {
    logs,
    isConnected,
    error,
    shouldAutoScroll,
    clearLogs,
  }
}
