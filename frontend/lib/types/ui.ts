export interface SystemMetric {
  id: string
  label: string
  value: number
  unit: string
  icon: string
  color: string
  trend?: "up" | "down" | "stable"
}

export interface ProcessedLog {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "success"
  message: string
  region: string
  instance: string
  app_name: string
}
