import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { FlyLog } from "@/lib/types/api"
import type { ProcessedLog, ProcessedLogWithMetadata, LogFilters } from "@/lib/types/ui"
import { connectToLogStream, type LogStreamConnection } from "@/lib/api/logs"
import { parseLogMessage } from "@/lib/utils/log-parser"
import {
  filterLogs,
  getAvailableFilterOptions,
  createEmptyFilters,
  hasActiveFilters as checkHasActiveFilters,
} from "@/lib/utils/log-filter"

function transformLog(flyLog: FlyLog): ProcessedLogWithMetadata {
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

  // Parse log message for metadata
  const parsed = parseLogMessage(flyLog.message)

  return {
    id: `${flyLog.timestamp}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: flyLog.timestamp,
    level,
    message: flyLog.message,
    region: flyLog.fly.region,
    instance: flyLog.fly.app.instance,
    app_name: flyLog.fly.app.name,
    parsed,
  }
}

export function useLogs(maxLogs = 1000) {
  const [logs, setLogs] = useState<ProcessedLogWithMetadata[]>([])
  const [filters, setFilters] = useState<LogFilters>(createEmptyFilters)
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

  // Memoized filtered logs
  const filteredLogs = useMemo(() => filterLogs(logs, filters), [logs, filters])

  // Memoized available filter options (from ALL logs, not filtered)
  const availableOptions = useMemo(() => getAvailableFilterOptions(logs), [logs])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(createEmptyFilters())
  }, [])

  const updateFilter = useCallback(<K extends keyof LogFilters>(key: K, value: LogFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  return {
    logs: filteredLogs,
    allLogs: logs,
    isConnected,
    error,
    shouldAutoScroll,
    clearLogs,
    // Filter-related
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters: checkHasActiveFilters(filters),
    availableOptions,
  }
}
