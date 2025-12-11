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

// Primary categories based on emoji prefix in log messages
export type LogCategory = "service" | "repository" | "webhook" | "ratelimit" | "config" | "analytics" | "unknown"

// Component types from the backend architecture
export type ComponentType = "service" | "repository" | "controller" | "jobHandler" | "middleware" | "jobType" | "unknown"

// Parsed metadata extracted from log message
export interface ParsedLogMetadata {
  category: LogCategory
  componentType: ComponentType
  componentName: string
  operation?: string
  rateLimitInfo?: {
    requests: number
    windowMs: number
  }
  keyValues?: Record<string, string>
}

// Extended ProcessedLog with parsed metadata
export interface ProcessedLogWithMetadata extends ProcessedLog {
  parsed: ParsedLogMetadata
}

// Filter state for log filtering
export interface LogFilters {
  levels: ProcessedLog["level"][]
  regions: string[]
  categories: LogCategory[]
  components: string[]
  searchQuery: string
}

// Available filter options (derived from current logs)
export interface AvailableFilterOptions {
  levels: ProcessedLog["level"][]
  regions: string[]
  categories: LogCategory[]
  components: string[]
}
