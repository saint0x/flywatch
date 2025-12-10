import { Activity, Cpu, HardDrive, Network } from "lucide-react"
import { useMetrics } from "@/hooks/use-metrics"

const iconMap = {
  cpu: Cpu,
  "hard-drive": HardDrive,
  network: Network,
  activity: Activity,
}

export function SystemMetrics() {
  const { metrics } = useMetrics()

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((metric) => {
            const IconComponent = iconMap[metric.icon as keyof typeof iconMap]

            return (
              <div
                key={metric.id}
                className="bg-gray-1/85 backdrop-blur-xl border border-gray-11/10 rounded-2xl p-4 shadow-[0px_27px_27px_0px_rgba(18,_18,_19,_0.09),_0px_7px_15px_0px_rgba(18,_18,_19,_0.10)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={metric.color}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-10 font-light" style={{ letterSpacing: "-0.36px" }}>
                    {metric.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-medium text-slate-12" style={{ letterSpacing: "-1.12px" }}>
                    {Math.round(metric.value)}
                  </span>
                  <span className="text-xs text-slate-9 font-light" style={{ letterSpacing: "-0.36px" }}>
                    {metric.unit}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
