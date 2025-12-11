import { useState, useEffect, useCallback } from "react"
import type { SystemMetric } from "@/lib/types/ui"
import type { MetricsResponse } from "@/lib/types/stats"
import { getSystemMetrics } from "@/lib/api/stats"

const POLL_INTERVAL = 10000 // 10 seconds

function transformMetricsToUI(data: MetricsResponse): SystemMetric[] {
  const cpuPercent = data.system?.cpu_usage_percent ?? 0
  const memoryPercent = data.system?.memory_usage_percent ?? 0
  const activeConnections = data.summary?.active_connections ?? 0
  const rps = data.summary?.requests_per_second ?? 0

  return [
    {
      id: "cpu",
      label: "CPU Usage",
      value: cpuPercent,
      unit: "%",
      icon: "cpu",
      color: cpuPercent > 80 ? "text-red-400" : cpuPercent > 60 ? "text-yellow-400" : "text-blue-400",
      trend: cpuPercent > 70 ? "up" : cpuPercent < 40 ? "down" : "stable",
    },
    {
      id: "memory",
      label: "Memory",
      value: memoryPercent,
      unit: "%",
      icon: "hard-drive",
      color: memoryPercent > 85 ? "text-red-400" : memoryPercent > 70 ? "text-yellow-400" : "text-green-400",
      trend: memoryPercent > 75 ? "up" : "stable",
    },
    {
      id: "connections",
      label: "Active Connections",
      value: activeConnections,
      unit: "",
      icon: "network",
      color: "text-purple-400",
      trend: "stable",
    },
    {
      id: "requests",
      label: "Requests",
      value: rps,
      unit: "/s",
      icon: "activity",
      color: "text-orange-400",
      trend: "stable",
    },
  ]
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [rawMetrics, setRawMetrics] = useState<MetricsResponse | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getSystemMetrics()
      setRawMetrics(data)
      setMetrics(transformMetricsToUI(data))
      setIsConnected(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics")
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()

    const interval = setInterval(fetchMetrics, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return {
    metrics,
    rawMetrics,
    isConnected,
    isHealthy: isConnected,
    error,
  }
}
