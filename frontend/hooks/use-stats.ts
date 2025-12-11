import { useState, useEffect, useCallback } from "react"
import { getAllStats } from "@/lib/api/stats"
import type { StatsData } from "@/lib/types/stats"

const POLL_INTERVAL = 10000 // 10 seconds

export function useStats() {
  const [data, setData] = useState<StatsData>({
    metrics: null,
    services: null,
    business: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const result = await getAllStats()
      setData({
        metrics: result.metrics,
        services: result.services,
        business: result.business,
      })

      if (result.errors.length > 0) {
        setError(result.errors.join(", "))
      } else {
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    const interval = setInterval(fetchStats, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchStats])

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchStats,
  }
}
