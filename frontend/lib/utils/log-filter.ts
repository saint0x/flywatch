import type { ProcessedLogWithMetadata, LogFilters, AvailableFilterOptions, LogCategory, ProcessedLog } from "@/lib/types/ui"
import { ALL_CATEGORIES } from "./log-parser"
import { formatTimestampWithMs } from "./format"

// Default options to show in dropdowns before any logs arrive
// Order: most important first
const DEFAULT_LEVELS: ProcessedLog["level"][] = ["error", "warn", "info", "success"]
const DEFAULT_CATEGORIES: LogCategory[] = ALL_CATEGORIES

/**
 * Apply filters to logs array
 * Returns filtered array without mutating original
 * Uses AND logic between different filter types
 * Uses OR logic within each filter type (e.g., level = error OR warn)
 */
export function filterLogs(logs: ProcessedLogWithMetadata[], filters: LogFilters): ProcessedLogWithMetadata[] {
  return logs.filter((log) => {
    // Level filter
    if (filters.levels.length > 0 && !filters.levels.includes(log.level)) {
      return false
    }

    // Region filter
    if (filters.regions.length > 0 && !filters.regions.includes(log.region)) {
      return false
    }

    // Category filter (from emoji)
    if (filters.categories.length > 0 && !filters.categories.includes(log.parsed.category)) {
      return false
    }

    // Component filter (specific component names)
    if (filters.components.length > 0 && !filters.components.includes(log.parsed.componentName)) {
      return false
    }

    // Search query (case-insensitive substring match + time search)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase().trim()

      // Check if query looks like a time pattern (HH:MM, HH:MM:SS, or HH:MM:SS.mmm)
      const isTimeQuery = /^\d{1,2}:\d{2}(:\d{2})?(\.\d{1,3})?$/.test(query)

      if (isTimeQuery) {
        // Match against formatted timestamp
        const formattedTime = formatTimestampWithMs(log.timestamp)
        if (!formattedTime.includes(query)) {
          return false
        }
      } else {
        // Standard text search on message and component
        const matchesMessage = log.message.toLowerCase().includes(query)
        const matchesComponent = log.parsed.componentName.toLowerCase().includes(query)
        if (!matchesMessage && !matchesComponent) {
          return false
        }
      }
    }

    return true
  })
}

/**
 * Extract available filter options from current logs
 * Returns unique values present in the log buffer
 * Categories always show all options for consistent filtering
 * Components only show validated component names that appear in logs
 */
export function getAvailableFilterOptions(logs: ProcessedLogWithMetadata[]): AvailableFilterOptions {
  const levels = new Set<ProcessedLogWithMetadata["level"]>()
  const regions = new Set<string>()
  const components = new Set<string>()

  for (const log of logs) {
    levels.add(log.level)
    regions.add(log.region)
    // Only add non-empty, validated component names
    if (log.parsed.componentName && log.parsed.componentName.length > 0) {
      components.add(log.parsed.componentName)
    }
  }

  return {
    levels: levels.size > 0 ? Array.from(levels).sort() : DEFAULT_LEVELS,
    regions: Array.from(regions).sort(),
    // Always show all categories for consistent filtering experience
    categories: DEFAULT_CATEGORIES,
    components: Array.from(components).sort(),
  }
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: LogFilters): boolean {
  return (
    filters.levels.length > 0 ||
    filters.regions.length > 0 ||
    filters.categories.length > 0 ||
    filters.components.length > 0 ||
    filters.searchQuery.length > 0
  )
}

/**
 * Create empty/default filter state
 */
export function createEmptyFilters(): LogFilters {
  return {
    levels: [],
    regions: [],
    categories: [],
    components: [],
    searchQuery: "",
  }
}
