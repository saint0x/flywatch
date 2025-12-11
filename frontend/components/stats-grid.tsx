import { useState, useEffect, useMemo } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { StatsCard } from "./stats-card"
import { useStats } from "@/hooks/use-stats"
import { Spinner } from "@/components/ui/spinner"
import type { StatsData, StatCardDefinition } from "@/lib/types/stats"

const STORAGE_KEY = "flywatch-stats-order"

// Define all available stat cards
const defaultCardDefinitions: StatCardDefinition[] = [
  // System metrics
  {
    id: "cpu",
    label: "CPU Usage",
    category: "system",
    type: "percentage",
    icon: "cpu",
    getValue: (d) => d.metrics?.system?.cpu_usage_percent ?? null,
  },
  {
    id: "memory",
    label: "Memory Usage",
    category: "system",
    type: "percentage",
    icon: "memory",
    getValue: (d) => d.metrics?.system?.memory_usage_percent ?? null,
    getSubtext: (d) => {
      if (!d.metrics?.system) return null
      const used = (d.metrics.system.memory_used_bytes / 1024 / 1024).toFixed(0)
      const total = (d.metrics.system.memory_total_bytes / 1024 / 1024).toFixed(0)
      return `${used} / ${total} MB`
    },
  },
  {
    id: "latency-p50",
    label: "Latency p50",
    category: "system",
    type: "duration",
    icon: "gauge",
    getValue: (d) => d.metrics?.performance?.latencyPercentiles?.p50 ?? null,
  },
  {
    id: "latency-p99",
    label: "Latency p99",
    category: "system",
    type: "duration",
    icon: "gauge",
    getValue: (d) => d.metrics?.performance?.latencyPercentiles?.p99 ?? null,
  },
  {
    id: "rps",
    label: "Requests/sec",
    category: "system",
    type: "rate",
    icon: "zap",
    getValue: (d) => d.metrics?.summary?.requests_per_second ?? null,
  },
  {
    id: "connections",
    label: "Active Connections",
    category: "system",
    type: "number",
    icon: "network",
    getValue: (d) => d.metrics?.summary?.active_connections ?? null,
  },
  {
    id: "uptime",
    label: "Uptime",
    category: "system",
    type: "duration",
    icon: "clock",
    getValue: (d) => {
      const secs = d.metrics?.system?.uptime_seconds
      if (!secs) return null
      const hours = Math.floor(secs / 3600)
      const mins = Math.floor((secs % 3600) / 60)
      return `${hours}h ${mins}m`
    },
  },

  // Services
  {
    id: "healthy-services",
    label: "Healthy Services",
    category: "services",
    type: "number",
    icon: "success",
    getValue: (d) => d.services?.services?.healthy?.length ?? null,
    getStatus: (d) => {
      const unhealthy = d.services?.services?.unavailable?.length ?? 0
      return unhealthy > 0 ? "warning" : "healthy"
    },
  },
  {
    id: "unhealthy-services",
    label: "Unhealthy Services",
    category: "services",
    type: "number",
    icon: "error",
    getValue: (d) => d.services?.services?.unavailable?.length ?? null,
    getStatus: (d) => {
      const unhealthy = d.services?.services?.unavailable?.length ?? 0
      return unhealthy > 0 ? "error" : "healthy"
    },
  },
  {
    id: "rate-limiter",
    label: "Rate Limiter Buckets",
    category: "services",
    type: "number",
    icon: "shield",
    getValue: (d) => d.services?.rateLimiter?.activeBuckets ?? null,
  },

  // Business metrics
  {
    id: "api-calls",
    label: "Total API Calls",
    category: "business",
    type: "number",
    icon: "activity",
    getValue: (d) => d.business?.usage?.apiCalls?.total ?? null,
  },
  {
    id: "vapi-calls",
    label: "VAPI Calls",
    category: "business",
    type: "number",
    icon: "phone",
    getValue: (d) => d.business?.usage?.vapiCalls?.totalCalls ?? null,
    getSubtext: (d) => {
      const avg = d.business?.usage?.vapiCalls?.averageDurationMs
      if (!avg) return null
      return `avg ${(avg / 1000).toFixed(1)}s`
    },
  },
  {
    id: "conversations",
    label: "Conversations",
    category: "business",
    type: "number",
    icon: "message",
    getValue: (d) => d.business?.usage?.conversations?.total ?? null,
  },
  {
    id: "jobs-pending",
    label: "Jobs Pending",
    category: "business",
    type: "number",
    icon: "briefcase",
    getValue: (d) => d.business?.jobs?.byStatus?.pending ?? null,
    getStatus: (d) => {
      const pending = d.business?.jobs?.byStatus?.pending ?? 0
      return pending > 100 ? "warning" : "healthy"
    },
  },
  {
    id: "jobs-failed",
    label: "Jobs Failed",
    category: "business",
    type: "number",
    icon: "warning",
    getValue: (d) => d.business?.jobs?.byStatus?.failed ?? null,
    getStatus: (d) => {
      const failed = d.business?.jobs?.byStatus?.failed ?? 0
      return failed > 0 ? "error" : "healthy"
    },
  },
  {
    id: "errors-total",
    label: "Total Errors",
    category: "business",
    type: "number",
    icon: "error",
    getValue: (d) => d.business?.errors?.total ?? null,
    getStatus: (d) => {
      const rate = d.business?.errors?.errorRate ?? 0
      if (rate > 0.01) return "error"
      if (rate > 0.001) return "warning"
      return "healthy"
    },
  },
  {
    id: "error-rate",
    label: "Error Rate",
    category: "business",
    type: "percentage",
    icon: "warning",
    getValue: (d) => {
      const rate = d.business?.errors?.errorRate
      if (rate === undefined) return null
      return rate * 100
    },
    getStatus: (d) => {
      const rate = d.business?.errors?.errorRate ?? 0
      if (rate > 0.01) return "error"
      if (rate > 0.001) return "warning"
      return "healthy"
    },
  },
]

function loadOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // ignore
  }
  return defaultCardDefinitions.map((c) => c.id)
}

function saveOrder(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {
    // ignore
  }
}

export function StatsGrid() {
  const { metrics, services, business, isLoading, error } = useStats()
  const [cardOrder, setCardOrder] = useState<string[]>(loadOrder)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const data: StatsData = useMemo(
    () => ({ metrics, services, business }),
    [metrics, services, business]
  )

  const orderedCards = useMemo(() => {
    const cardMap = new Map(defaultCardDefinitions.map((c) => [c.id, c]))
    const ordered: StatCardDefinition[] = []

    // Add cards in saved order
    for (const id of cardOrder) {
      const card = cardMap.get(id)
      if (card) {
        ordered.push(card)
        cardMap.delete(id)
      }
    }

    // Add any new cards that weren't in saved order
    for (const card of cardMap.values()) {
      ordered.push(card)
    }

    return ordered
  }, [cardOrder])

  useEffect(() => {
    saveOrder(cardOrder)
  }, [cardOrder])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  if (isLoading && !metrics && !services && !business) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8 text-slate-10" />
      </div>
    )
  }

  if (error && !metrics && !services && !business) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-slate-10 text-sm">Failed to load stats</p>
          <p className="text-slate-11 text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {orderedCards.map((card) => (
              <StatsCard
                key={card.id}
                id={card.id}
                label={card.label}
                value={card.getValue(data)}
                type={card.type}
                icon={card.icon}
                subtext={card.getSubtext?.(data)}
                status={card.getStatus?.(data)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {error && (
        <div className="mt-4 text-center">
          <p className="text-yellow-500 text-xs">Some data may be stale: {error}</p>
        </div>
      )}
    </div>
  )
}
