import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Cpu,
  HardDrive,
  Activity,
  Network,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Users,
  MessageSquare,
  Phone,
  Briefcase,
  Server,
  Shield,
  Gauge,
  type LucideIcon,
} from "lucide-react"
import type { StatCardType } from "@/lib/types/stats"

const iconMap: Record<string, LucideIcon> = {
  cpu: Cpu,
  memory: HardDrive,
  activity: Activity,
  network: Network,
  clock: Clock,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
  zap: Zap,
  users: Users,
  message: MessageSquare,
  phone: Phone,
  briefcase: Briefcase,
  server: Server,
  shield: Shield,
  gauge: Gauge,
}

const colorMap: Record<string, string> = {
  cpu: "text-blue-500",
  memory: "text-purple-500",
  activity: "text-green-500",
  network: "text-cyan-500",
  clock: "text-amber-500",
  warning: "text-yellow-500",
  success: "text-emerald-500",
  error: "text-red-500",
  zap: "text-orange-500",
  users: "text-indigo-500",
  message: "text-teal-500",
  phone: "text-pink-500",
  briefcase: "text-slate-500",
  server: "text-violet-500",
  shield: "text-lime-500",
  gauge: "text-rose-500",
}

interface StatsCardProps {
  id: string
  label: string
  value: number | string | null
  type: StatCardType
  icon: string
  subtext?: string | null
  status?: "healthy" | "warning" | "error"
}

function formatValue(value: number | string | null, type: StatCardType): string {
  if (value === null) return "--"
  if (typeof value === "string") return value

  switch (type) {
    case "percentage":
      return `${value.toFixed(1)}`
    case "duration":
      if (value < 1000) return `${Math.round(value)}`
      return `${(value / 1000).toFixed(1)}`
    case "rate":
      return value.toFixed(2)
    case "number":
    default:
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
      return Math.round(value).toString()
  }
}

function getUnit(type: StatCardType, value: number | string | null): string {
  if (value === null) return ""
  switch (type) {
    case "percentage":
      return "%"
    case "duration":
      return typeof value === "number" && value >= 1000 ? "s" : "ms"
    case "rate":
      return "/s"
    default:
      return ""
  }
}

export function StatsCard({ id, label, value, type, icon, subtext, status }: StatsCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const IconComponent = iconMap[icon] || Activity
  const iconColor = colorMap[icon] || "text-slate-500"

  const statusBorder =
    status === "error"
      ? "border-red-500/30"
      : status === "warning"
        ? "border-yellow-500/30"
        : "border-gray-11/10"

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-gray-1/85 backdrop-blur-xl border ${statusBorder} rounded-2xl p-4 shadow-[0px_27px_27px_0px_rgba(18,_18,_19,_0.09),_0px_7px_15px_0px_rgba(18,_18,_19,_0.10)] cursor-grab active:cursor-grabbing select-none transition-all hover:bg-gray-1/95`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={iconColor}>
          <IconComponent className="w-4 h-4" />
        </div>
        <span className="text-xs text-slate-10 font-light truncate" style={{ letterSpacing: "-0.36px" }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-medium text-slate-12" style={{ letterSpacing: "-1.12px" }}>
          {formatValue(value, type)}
        </span>
        <span className="text-xs text-slate-9 font-light" style={{ letterSpacing: "-0.36px" }}>
          {getUnit(type, value)}
        </span>
      </div>
      {subtext && (
        <div className="mt-1 text-xs text-slate-10 font-light truncate" style={{ letterSpacing: "-0.36px" }}>
          {subtext}
        </div>
      )}
    </div>
  )
}
